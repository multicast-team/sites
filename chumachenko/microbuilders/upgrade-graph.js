// The upgrade tree (docs/gdd/02-construction-session.md «Граф прокачек»), shared by the site sheet
// «Улучшения» (ui.js) and the HQ tech center (game.js renderTech): the same nodes, icons, gate
// hexagons, layout and links, so a technology sits exactly where its line sits on the site. Callers
// decide what each node shows (views) and react to taps (onSelect). The layout is the hand-placed
// one of the graph tool (balance.json → upgradeLayout, graph-tool.html) where it has a node, else
// the automatic radial one (radialLayout).
(function () {
  const RING = 72;
  const PAD = 36;
  const HEX = '<svg class="graph-gate-hex" viewBox="0 0 48 48" aria-hidden="true"><polygon points="24,2 43,13 43,35 24,46 5,35 5,13"/></svg>';

  function treeOf(tree) {
    const parent = {};
    const children = {};
    tree.forEach(function (pair) {
      parent[pair[0]] = pair[1] || null;
      children[pair[0]] = [];
    });
    tree.forEach(function (pair) { if (pair[1] && children[pair[1]]) children[pair[1]].push(pair[0]); });
    const rootPair = tree.find(function (pair) { return !pair[1]; });
    return { parent: parent, children: children, root: rootPair ? rootPair[0] : null };
  }

  // Radial tree, laid out once over the whole tree (so buying never moves a node): the root at 0, 0,
  // one ring per depth. Every leaf gets a slice of the circle ∝ 1 / its depth (the same arc on any
  // ring), so a big branch takes more of the circle and nodes keep at least a ring apart; a node sits
  // in the middle of its leaves' slices, the first branch points up. → { kind: { x, y, r, a } }.
  function radialLayout(tree, ring) {
    const shape = treeOf(tree);
    const children = shape.children;
    const step = ring || RING;
    const angle = {};
    const depth = {};
    const span = {};
    const pos = {};
    let total = 0;
    (function place(kind, level) {
      depth[kind] = level;
      const kids = children[kind];
      if (kids.length === 0) {
        span[kind] = [total, total + 1 / Math.max(1, level)];
        total = span[kind][1];
        return;
      }
      kids.forEach(function (child) { place(child, level + 1); });
      span[kind] = [span[kids[0]][0], span[kids[kids.length - 1]][1]];
    })(shape.root, 0);
    const first = span[children[shape.root][0]] || span[shape.root];
    const turn = (first[0] + first[1]) / 2;
    tree.forEach(function (pair) {
      const kind = pair[0];
      if (!span[kind]) return;
      angle[kind] = ((span[kind][0] + span[kind][1]) / 2 - turn) / total * Math.PI * 2;
      const r = depth[kind] * step;
      // 0 rad points up, so the first branch grows upward and the rest go round clockwise.
      pos[kind] = { x: Math.sin(angle[kind]) * r, y: -Math.cos(angle[kind]) * r, r: r, a: angle[kind] };
    });
    return pos;
  }

  // A link from a parent at `a` to a child at `b` ({ x, y }) between hand-placed nodes: an S-curve
  // leaving and entering along the longer axis. SVG path data.
  function linkPath(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const c = Math.abs(dy) >= Math.abs(dx)
      ? [a.x, a.y + dy / 2, b.x, b.y - dy / 2]
      : [a.x + dx / 2, a.y, b.x - dx / 2, b.y];
    return 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' C' + c[0].toFixed(1) + ' ' + c[1].toFixed(1) + ' ' +
      c[2].toFixed(1) + ' ' + c[3].toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
  }

  // opts: { root — the scroll box, tree — [kind, parent] pairs (parents first), gates — balance.gates
  // (gate.badge — the corner text instead of its token price, '' — none),
  // icon(kind) → file in icons/, name(kind) → aria label, onSelect(kind | null) — a tap on a node
  // (a second tap on the selected one or a tap beside the nodes gives null) }.
  // ring — the distance between depths (RING by default; a wide star of many leaves needs more).
  // layout — { kind: [x, y] } hand-placed centres (balance.json → upgradeLayout); nodes it lacks keep
  // their radial place, shifted with the root.
  function create(opts) {
    const root = opts.root;
    const ring = opts.ring || RING;
    const tree = opts.tree;
    const gates = opts.gates || {};
    const marks = window.MicroBuildersIcons || {};
    const shape = treeOf(tree);
    const parent = shape.parent;
    const rootKind = shape.root;

    const canvas = document.createElement('div');
    canvas.className = 'graph-canvas';
    canvas.innerHTML = '<svg class="graph-links" aria-hidden="true"></svg>';
    const links = canvas.firstChild;
    root.appendChild(canvas);
    const nodes = {};
    tree.forEach(function (pair) {
      const kind = pair[0];
      const gate = gates[kind];
      const node = document.createElement('button');
      node.type = 'button';
      node.className = gate ? 'graph-node graph-gate' : 'graph-node';
      node.dataset.kind = kind;
      node.setAttribute('aria-label', gate ? gate.name : opts.name(kind) || kind);
      // The level must stay the second child (ui.js paints it by position).
      node.innerHTML = gate
        ? HEX + '<img class="graph-gate-icon" alt="" src="icons/' + (gate.icon || 'icon-gate-token.jpg') + '">' +
          '<b class="graph-gate-cost">' + (gate.badge !== undefined ? gate.badge : gate.tokens || 1) + '</b><i class="graph-gate-name">' + gate.name + '</i><i class="graph-q">?</i>' +
          '<i class="graph-lock">' + (marks.lock || '') + '</i>'
        : '<img alt="" src="icons/' + opts.icon(kind) + '"><i class="graph-level"></i><i class="graph-q">?</i><i class="graph-lock">' + (marks.lock || '') + '</i>' +
          '<i class="graph-dot"></i><i class="graph-check">' + (marks.check || '') + '</i>';
      node.hidden = true;
      canvas.appendChild(node);
      nodes[kind] = node;
    });

    // Laid out once over the whole tree (so buying never moves a node).
    const pos = {};
    let centre = null;
    (function layout() {
      const radial = radialLayout(tree, ring);
      const placed = opts.layout || {};
      const origin = placed[rootKind] ? { x: placed[rootKind][0], y: placed[rootKind][1] } : { x: 0, y: 0 };
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      tree.forEach(function (pair) {
        const kind = pair[0];
        const at = placed[kind];
        const p = at ? { x: at[0], y: at[1], hand: true } : { x: radial[kind].x + origin.x, y: radial[kind].y + origin.y, r: radial[kind].r, a: radial[kind].a };
        pos[kind] = p;
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      });
      const width = maxX - minX + PAD * 2;
      const height = maxY - minY + PAD * 2;
      tree.forEach(function (pair) {
        const p = pos[pair[0]];
        p.x += PAD - minX;
        p.y += PAD - minY;
        nodes[pair[0]].style.left = p.x + 'px';
        nodes[pair[0]].style.top = p.y + 'px';
      });
      centre = { x: pos[rootKind].x, y: pos[rootKind].y, hand: Object.keys(placed).length > 0 };
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      links.setAttribute('width', width);
      links.setAttribute('height', height);
    })();

    let views = {};
    let key = '';
    let selected = null;

    // Soft radial links: from the parent's ring to the child's ring along an S-curve whose control
    // points sit on the middle ring at the parent's and the child's angles; between hand-placed
    // nodes — linkPath.
    function drawLinks() {
      let paths = '';
      tree.forEach(function (pair) {
        const kind = pair[0];
        const view = views[kind];
        nodes[kind].hidden = view === 'hidden';
        if (!pair[1] || view === 'hidden') return;
        const a = pos[pair[1]];
        const b = pos[kind];
        let d;
        if (centre.hand) {
          d = linkPath(a, b);
        } else {
          const mid = (a.r + b.r) / 2;
          const c1x = centre.x + Math.sin(a.a) * mid;
          const c1y = centre.y - Math.cos(a.a) * mid;
          const c2x = centre.x + Math.sin(b.a) * mid;
          const c2y = centre.y - Math.cos(b.a) * mid;
          d = 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) +
            ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
        }
        paths += '<path class="' + (view === 'preview' || view === 'office' ? 'dim' : 'lit') + '" d="' + d + '"/>';
      });
      links.innerHTML = paths;
    }

    root.addEventListener('click', function (event) {
      const node = event.target.closest('.graph-node');
      const kind = node && canvas.contains(node) ? node.dataset.kind : null;
      if (opts.onSelect) opts.onSelect(kind && kind !== selected ? kind : null);
    });

    return {
      root: root,
      nodes: nodes,
      parent: parent,
      // views[kind]: 'owned' | 'available' | 'office' (locked) | 'preview' («?») | 'hidden', or any other
      // word for a plain node. Sets the shared state classes; links and visibility are redrawn only
      // when some view changed (→ true).
      paint: function (next) {
        views = {};
        let nextKey = '';
        tree.forEach(function (pair) {
          const view = views[pair[0]] = next[pair[0]] || 'hidden';
          const node = nodes[pair[0]];
          nextKey += view + ',';
          node.classList.toggle('is-owned', view === 'owned');
          node.classList.toggle('is-preview', view === 'preview');
          node.classList.toggle('is-office', view === 'office');
        });
        if (nextKey === key) return false;
        key = nextKey;
        drawLinks();
        return true;
      },
      // The tapped node grows and gets a white ring; null clears it.
      select: function (kind) {
        if (selected && nodes[selected]) nodes[selected].classList.remove('on');
        selected = kind && nodes[kind] ? kind : null;
        if (selected) nodes[selected].classList.add('on');
      },
      // Scrolls the box so the root node is in its middle.
      centre: function () {
        root.scrollLeft = Math.max(0, centre.x - root.clientWidth / 2);
        root.scrollTop = Math.max(0, centre.y - root.clientHeight / 2);
      },
    };
  }

  window.MicroBuildersGraph = { create: create, radialLayout: radialLayout, linkPath: linkPath, treeOf: treeOf, PAD: PAD };
})();

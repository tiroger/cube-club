// escapeHTML, html`...` and raw() from core.js.
(function () {
  const { escapeHTML, html, raw } = CubeClubCore;
  let passed = 0;
  function assert(condition, message) {
    if (!condition) throw new Error(message);
    passed++;
  }
  const same = (actual, expected, message) => assert(String(actual) === expected, `${message}: got ${actual}`);

  same(escapeHTML(`<img src=x onerror="go('a')">&\``), '&lt;img src=x onerror=&quot;go(&#39;a&#39;)&quot;&gt;&amp;&#96;', 'Every markup character is escaped');
  same(escapeHTML(null), '', 'null escapes to empty text');
  same(escapeHTML(undefined), '', 'undefined escapes to empty text');
  same(escapeHTML(0), '0', 'Zero is kept');
  same(escapeHTML('Cube & “club” ✦'), 'Cube &amp; “club” ✦', 'Typographic quotes and symbols are untouched');

  const name = '<b onclick="x()">Sam</b>';
  same(html`<p class="name">${name}</p>`, '<p class="name">&lt;b onclick=&quot;x()&quot;&gt;Sam&lt;/b&gt;</p>', 'Interpolated text is escaped');
  same(html`<p title="${'" onmouseover="x()'}">`, '<p title="&quot; onmouseover=&quot;x()">', 'Attribute values cannot break out of quotes');
  same(html`<ul>${['<a>', 'b'].map(t => html`<li>${t}</li>`)}</ul>`, '<ul><li>&lt;a&gt;</li><li>b</li></ul>', 'Arrays of html fragments are joined unescaped, their values escaped');
  same(html`<ul>${['<a>', 'b']}</ul>`, '<ul>&lt;a&gt;b</ul>', 'Arrays of plain text are escaped');
  same(html`<div>${html`<em>${'<i>'}</em>`}</div>`, '<div><em>&lt;i&gt;</em></div>', 'Nested html is not escaped twice');
  same(html`${raw('<svg aria-hidden="true"></svg>')}${'<x>'}`, '<svg aria-hidden="true"></svg>&lt;x&gt;', 'raw() marks trusted markup');
  same(html`${raw(raw('<b>'))}`, '<b>', 'raw() of raw() stays single');
  same(html`a${null}b${undefined}c${false}d${0}e`, 'abcd0e', 'Empty values render nothing; zero renders');
  same(html`${true && 'yes'}${false && 'no'}`, 'yes', 'Conditional fragments work');
  same(html`line\nnext`, 'line\nnext', 'Template escapes are cooked like an ordinary template');
  same(html``, '', 'Empty template');
  same(`<div>${html`<b>${'&'}</b>`}</div>`, '<div><b>&amp;</b></div>', 'html output converts to a string inside ordinary templates');
  assert(typeof html`x`.toString() === 'string' && String(html`x`) === 'x', 'html output is a string-like value');

  return `${passed} HTML safety checks passed: escaping, attributes, nesting, arrays, raw markup and empty values.`;
})();

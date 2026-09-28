#!/usr/bin/env python3
"""Horn Studio rebuild: embed engine.js into index.html (the app's single file) and
stamp "build NNN · date" from the LAST numbered PROJECT_STATE.md entry.
Contract (PROJECT_STATE rule 1): engine edits go to engine.js, then run this, then
`node smoke_test.js index.html`. Never edit the embedded copy by hand.
Layout of index.html:  <head/css/html> ... "(function () {\n"  ENGINE  "  /* ================= state ================= */" ... app
"""
import re, sys, datetime, hashlib
HTML = 'index.html'; ENGINE = 'engine.js'; STATE = 'PROJECT_STATE.md'
START = '(function () {\n'
END = '  /* ================= state ================= */'
h = open(HTML, encoding='utf-8').read()
e = open(ENGINE, encoding='utf-8').read()
i = h.find(START); assert i > 0, 'start marker missing'
i += len(START)
j = h.find(END, i); assert j > i, 'end marker missing'
# strip the node-only export line from the embedded copy
exp = e.find('if (typeof module !== "undefined") module.exports')
body = (e[:exp] if exp > 0 else e).rstrip() + '\n\n\n'
# stamp from the last numbered entry in PROJECT_STATE
ents = re.findall(r'^(\d{2,4})\. \(', open(STATE, encoding='utf-8').read(), re.M)
n = ents[-1] if ents else '???'
today = datetime.date.today().isoformat()
h2 = h[:i] + body + '\n' + h[j:]
h2, k = re.subn(r'build \d+ · \d{4}-\d{2}-\d{2}', 'build %s · %s' % (n, today), h2)
assert k == 1, 'buildstamp not found exactly once (%d)' % k
open(HTML, 'w', encoding='utf-8').write(h2)
print('rebuilt %s: build %s · %s, %d bytes, md5 %s' % (HTML, n, today, len(h2.encode('utf-8')), hashlib.md5(h2.encode('utf-8')).hexdigest()))

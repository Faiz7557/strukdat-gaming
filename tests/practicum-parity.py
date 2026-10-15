"""Check excerpts against the DOCX files and compare core behavior with real Python.

Uses only Python/Node standard libraries; the web app does not execute Python.
"""
import json
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
payload = json.loads(subprocess.check_output([
    "node", "--input-type=module", "-e", """
import {lessons} from './execution.js';
import {Stack,Queue} from './model.js';
const s=new Stack(),q=new Queue(),states=[];
const data=id=>({id,name:id,weight:1});
const state=(result)=>states.push({stack:s.values(),queue:q.values(),result});
state(s.pop());
for(const id of ['10','20','30']){s.push(data(id));q.enqueue(data(id));state(null);}
for(let i=0;i<4;i++){state(s.pop());state(q.dequeue());}
console.log(JSON.stringify({lessons,states}));
"""
], cwd=ROOT, text=True, encoding="utf-8"))

for name, lesson in payload["lessons"].items():
    with zipfile.ZipFile(ROOT.parent / lesson["document"]) as doc:
        xml = ET.fromstring(doc.read("word/document.xml"))
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    lines = []
    for paragraph in xml.findall(".//w:p", ns):
        text = "".join(t.text or "" for t in paragraph.findall(".//w:t", ns))
        lines.extend(line.strip() for line in text.splitlines() if line.strip())
    excerpt = [line.strip() for line in lesson["lines"]]
    assert any(lines[i:i+len(excerpt)] == excerpt for i in range(len(lines))), name

class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

class Stack:
    def __init__(self):
        self.top = None

class Queue:
    def __init__(self):
        self.front = None
        self.rear = None

for name, lesson in payload["lessons"].items():
    namespace = {"Node": Node}
    exec("\n".join(lesson["lines"]), namespace)
    setattr(Stack if name in ("push", "pop") else Queue, name, namespace[name])

def values(node):
    out = []
    while node is not None:
        out.append(node.data)
        node = node.next
    return out

s, q, states = Stack(), Queue(), []
def state(result):
    states.append({"stack": values(s.top), "queue": values(q.front), "result": result})

state(s.pop())
for ident in ("10", "20", "30"):
    data = {"id": ident, "name": ident, "weight": 1}
    s.push(data)
    q.enqueue(data)
    state(None)
for _ in range(4):
    state(s.pop())
    state(q.dequeue())
assert states == payload["states"], "Python and JavaScript results differ"
assert q.front is None and q.rear is None and s.top is None
print("PASS: all four excerpts match DOCX; 12 Python/JavaScript states agree, including underflow.")

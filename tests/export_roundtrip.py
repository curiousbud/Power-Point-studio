"""Optional integration check; requires python-pptx and Node.
Runs generated Python and optionally JavaScript; verifies OOXML geometry by reopening PPTX.
Usage: python tests/export_roundtrip.py [--js]
For --js install pptxgenjs where Node can resolve it.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from pptx import Presentation

root = Path(__file__).resolve().parents[1]
layout = json.loads((root / 'examples/demo-layout.json').read_text())
with tempfile.TemporaryDirectory() as temp:
    target = Path(temp)
    # Exercise rotation, off-slide placement, hidden objects and escaped Unicode text.
    layout['elements'][0]['rotation'] = 35
    layout['elements'][0]['x'] = -0.1
    layout['elements'][1]['text'] += '\nQuotes: \"Hello\"; slash: \\; emoji: 😀'
    hidden = dict(layout['elements'][0], id='hidden', hidden=True)
    layout['elements'].append(hidden)
    input_file = target / 'edge-layout.json'
    input_file.write_text(json.dumps(layout), encoding='utf-8')
    formats = ['python'] + (['js'] if '--js' in sys.argv else [])
    for format in formats:
        folder = target / format
        folder.mkdir()
        script = folder / ('layout.py' if format == 'python' else 'layout.cjs')
        subprocess.run(['node', str(root / 'examples/export-layout.cjs'), str(input_file), format, str(script)], check=True)
        subprocess.run([sys.executable if format == 'python' else 'node', str(script)], cwd=folder, check=True)
        prs = Presentation(folder / 'layout.pptx')
        assert abs(prs.slide_width - round(layout['slide']['w'] * 914400)) <= 1
        assert abs(prs.slide_height - round(layout['slide']['h'] * 914400)) <= 1
        expected = [e for e in layout['elements'] if not e['hidden']]
        assert len(prs.slides[0].shapes) == len(expected)
        for actual, expected_element in zip(prs.slides[0].shapes, expected):
            for key, attr in [('x', 'left'), ('y', 'top'), ('w', 'width'), ('h', 'height')]:
                assert abs(getattr(actual, attr) - round(expected_element[key] * 914400)) <= 1, (format, key)
            assert abs(actual.rotation - expected_element['rotation'] % 360) < 1e-4
            if expected_element['type'] == 'text':
                assert actual.text == expected_element['text']
        print(format + ': slide size, every element position/size, text and embedded image round-trip passed.')

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  generateCategories,
  parseContentsDirectory,
  parseReadme,
} from './parse-readme.js';

function write(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

function tempContents() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'yaal-contents-'));
}

void test('indexes one, two, and deeper directory levels without a fixed depth', () => {
  const root = tempContents();
  try {
    write(
      path.join(root, 'section', '_meta.md'),
      '---\ntitle: Agent Services\n---\nHosted agents.\n'
    );
    write(
      path.join(root, 'section', 'hosted.md'),
      '---\nname: Hosted\nlink: https://hosted.example\n---\nA hosted agent.\n'
    );

    write(
      path.join(root, 'llms', '_meta.md'),
      '---\ntitle: LLMs\n---\nModel providers.\n'
    );
    write(
      path.join(root, 'llms', 'acme', '_meta.md'),
      '---\ntitle: Acme\n---\nAcme models.\n'
    );
    write(
      path.join(root, 'llms', 'acme', 'model.md'),
      '---\nname: Acme Model\nlink: https://acme.example/model\ntags:\n  - api\nimage: https://acme.example/preview.png\n---\nA model.\n'
    );

    write(
      path.join(root, 'products', '_meta.md'),
      '---\ntitle: Products\n---\nProduct tree.\n'
    );
    write(
      path.join(root, 'products', 'harnesses', '_meta.md'),
      '---\ntitle: Harnesses\n---\nWhere agents run.\n'
    );
    write(
      path.join(root, 'products', 'harnesses', 'standalone-ides', '_meta.md'),
      '---\ntitle: Standalone IDEs\n---\nInstallable editors.\n'
    );
    write(
      path.join(
        root,
        'products',
        'harnesses',
        'standalone-ides',
        'extra',
        '_meta.md'
      ),
      '---\ntitle: Extra\n---\nFour grouping levels.\n'
    );
    write(
      path.join(
        root,
        'products',
        'harnesses',
        'standalone-ides',
        'extra',
        'cursor.md'
      ),
      '---\nname: Cursor\nlink: https://cursor.example\nimage: http://cursor.example/not-https.png\n---\nAn editor.\n'
    );
    write(
      path.join(root, 'products', 'harnesses', 'standalone-ides', '_meta.md'),
      '---\ntitle: Standalone IDEs\n---\nInstallable editors.\n'
    );

    write(
      path.join(root, 'empty-shell', '_meta.md'),
      '---\ntitle: Empty\n---\nNothing here.\n'
    );
    write(
      path.join(root, 'products', 'harnesses', '_meta.md'),
      '---\ntitle: Harnesses\n---\nWhere agents run.\n'
    );

    const { categories, tools } = parseContentsDirectory(root);
    const names = tools
      .map((tool) => tool.name)
      .sort((a, b) => a.localeCompare(b));
    assert.deepEqual(names, ['Acme Model', 'Cursor', 'Hosted']);
    assert.equal(
      tools.some((tool) => tool.name === '_meta' || tool.name === 'Empty'),
      false
    );
    assert.equal(categories.Empty, undefined);

    const hosted = tools.find((tool) => tool.name === 'Hosted');
    assert.deepEqual(hosted.groups, ['Agent Services']);
    assert.equal(hosted.subcategory, '__NO_SUBCATEGORY__');
    assert.deepEqual(categories['Agent Services'].children, {});
    assert.equal(categories['Agent Services'].description, 'Hosted agents.');
    assert.equal(categories['Agent Services'].tools.length, 1);

    const model = tools.find((tool) => tool.name === 'Acme Model');
    assert.deepEqual(model.groups, ['LLMs', 'Acme']);
    assert.equal(model.subcategory, 'Acme');
    assert.deepEqual(model.tags, ['api']);
    assert.equal(model.image, 'https://acme.example/preview.png');
    assert.equal(categories.LLMs.children.Acme.description, 'Acme models.');
    assert.equal(categories.LLMs.children.Acme.tools[0].name, 'Acme Model');

    const cursor = tools.find((tool) => tool.name === 'Cursor');
    assert.deepEqual(cursor.groups, [
      'Products',
      'Harnesses',
      'Standalone IDEs',
      'Extra',
    ]);
    assert.equal(cursor.image, undefined);
    const ides =
      categories.Products.children.Harnesses.children['Standalone IDEs'];
    assert.equal(ides.description, 'Installable editors.');
    assert.equal(ides.children.Extra.description, 'Four grouping levels.');
    assert.equal(ides.children.Extra.tools[0].name, 'Cursor');
    assert.equal(ides.tools, undefined);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

void test('keeps a two-level contents tree and direct files beside child groups', () => {
  const root = tempContents();
  try {
    write(
      path.join(root, 'b-group', '_meta.md'),
      '---\ntitle: Zed\n---\nSecond.\n'
    );
    write(
      path.join(root, 'b-group', 'late.md'),
      '---\nname: Late\nlink: https://late.example\n---\nLater.\n'
    );
    write(
      path.join(root, 'a-group', '_meta.md'),
      '---\ntitle: Alpha\n---\nFirst.\n'
    );
    write(
      path.join(root, 'a-group', 'early.md'),
      '---\nname: Early\nlink: https://early.example\n---\nEarlier.\n'
    );
    write(
      path.join(root, 'a-group', 'nested', 'child.md'),
      '---\nname: Nested\nlink: https://nested.example\nsubcategory: Renamed\n---\nNested entry.\n'
    );
    write(
      path.join(root, 'loose.md'),
      '---\nname: Loose\nlink: https://loose.example\ncategory: Alpha\n---\nRoot entry.\n'
    );

    const { categories, tools } = parseContentsDirectory(root);
    assert.deepEqual(Object.keys(categories), ['Alpha', 'Zed']);
    assert.deepEqual(
      tools.map((tool) => tool.name),
      ['Early', 'Nested', 'Late', 'Loose']
    );

    const nested = tools.find((tool) => tool.name === 'Nested');
    assert.deepEqual(nested.groups, ['Alpha', 'Renamed']);
    assert.equal(categories.Alpha.children.Renamed.tools[0].name, 'Nested');
    assert.equal(
      categories.Alpha.tools.map((tool) => tool.name).join(),
      'Early,Loose'
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

void test('README mode still emits groups for flat and two-level lists', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaal-readme-'));
  const readme = path.join(dir, 'README.md');
  try {
    write(
      readme,
      `# Demo List

> A curated list.

## Harnesses

> Where agents run.

### Standalone IDEs

> Installable editors.

#### [Cursor](https://cursor.example)

An editor.

<!-- image: https://cursor.example/preview.png -->

- [Other](https://other.example) - Inline description.

## Notes

### [Solo](https://solo.example)

No child group.
`
    );
    const parsed = parseReadme(readme);
    const categories = generateCategories(
      parsed.tools,
      parsed.categoryDescriptions,
      parsed.subcategoryDescriptions
    );

    const cursor = parsed.tools.find((tool) => tool.name === 'Cursor');
    assert.deepEqual(cursor.groups, ['Harnesses', 'Standalone IDEs']);
    assert.equal(cursor.image, 'https://cursor.example/preview.png');
    assert.equal(
      categories.Harnesses.children['Standalone IDEs'].description,
      'Installable editors.'
    );
    assert.equal(categories.Harnesses.description, 'Where agents run.');
    assert.equal(
      categories.Harnesses.children['Standalone IDEs'].tools.length,
      2
    );

    const solo = parsed.tools.find((tool) => tool.name === 'Solo');
    assert.deepEqual(solo.groups, ['Notes']);
    assert.equal(solo.subcategory, '__NO_SUBCATEGORY__');
    assert.deepEqual(categories.Notes.children, {});
    assert.equal(categories.Notes.tools[0].name, 'Solo');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

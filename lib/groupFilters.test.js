import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendPathParams,
  buildFilterRows,
  pathFromSearchParams,
  toolGroups,
  toolMatchesSelection,
} from './groupFilters.js';

const deep = {
  name: 'Products',
  description: 'Product tree',
  children: {
    Harnesses: {
      name: 'Harnesses',
      description: 'Where agents run',
      children: {
        'Standalone IDEs': {
          name: 'Standalone IDEs',
          description: 'Editors',
          children: {
            Extra: { name: 'Extra', description: 'Fourth level', children: {} },
          },
        },
      },
    },
  },
};

function kinds(rows) {
  return rows.map((row) => row.kind);
}

void test('tags stay after every directory row and empty levels are omitted', () => {
  const tags = ['cli', 'mcp'];

  const leaf = buildFilterRows({
    category: { name: 'Agent Services', description: '', children: {} },
    selectedPath: [],
    tags,
    selectedTags: [],
  });
  assert.deepEqual(kinds(leaf), ['tags']);

  const twoLevel = buildFilterRows({
    category: {
      name: 'LLMs',
      children: {
        Acme: { name: 'Acme', description: 'Models', children: {} },
      },
    },
    selectedPath: [],
    tags,
    selectedTags: ['mcp'],
  });
  assert.deepEqual(kinds(twoLevel), ['groups', 'tags']);
  assert.equal(twoLevel[0].depth, 0);
  assert.deepEqual(
    twoLevel[0].options.map((option) => option.name),
    ['Acme']
  );
  assert.equal(twoLevel[1].selected[0], 'mcp');

  const selectedLeaf = buildFilterRows({
    category: {
      name: 'LLMs',
      children: {
        Acme: { name: 'Acme', description: 'Models', children: {} },
      },
    },
    selectedPath: ['Acme'],
    tags,
    selectedTags: [],
  });
  assert.deepEqual(kinds(selectedLeaf), ['groups', 'tags']);
  assert.equal(selectedLeaf[0].selected, 'Acme');

  const deeper = buildFilterRows({
    category: deep,
    selectedPath: ['Harnesses', 'Standalone IDEs'],
    tags,
    selectedTags: [],
  });
  assert.deepEqual(kinds(deeper), ['groups', 'groups', 'groups', 'tags']);
  assert.deepEqual(
    deeper.filter((row) => row.kind === 'groups').map((row) => row.selected),
    ['Harnesses', 'Standalone IDEs', '']
  );
  assert.deepEqual(
    deeper[2].options.map((option) => option.name),
    ['Extra']
  );

  const atFourth = buildFilterRows({
    category: deep,
    selectedPath: ['Harnesses', 'Standalone IDEs', 'Extra'],
    tags: [],
    selectedTags: [],
  });
  assert.deepEqual(kinds(atFourth), ['groups', 'groups', 'groups']);
  assert.equal(atFourth[2].selected, 'Extra');
});

void test('legacy subcategory maps still produce one child row before tags', () => {
  const rows = buildFilterRows({
    category: {
      name: 'Harnesses',
      subcategories: {
        __NO_SUBCATEGORY__: { name: '__NO_SUBCATEGORY__' },
        'Terminal CLIs': { name: 'Terminal CLIs', description: 'Shells' },
        'Standalone IDEs': { name: 'Standalone IDEs', description: 'Editors' },
      },
    },
    selectedPath: [],
    tags: ['mcp'],
    selectedTags: [],
  });
  assert.deepEqual(kinds(rows), ['groups', 'tags']);
  assert.deepEqual(
    rows[0].options.map((option) => option.name),
    ['Terminal CLIs', 'Standalone IDEs']
  );
});

void test('path matching keeps shallow lists and prefix-matches deeper ones', () => {
  const deepTool = {
    category: 'Products',
    subcategory: 'Harnesses',
    groups: ['Products', 'Harnesses', 'Standalone IDEs', 'Extra'],
  };
  assert.equal(toolMatchesSelection(deepTool, ['Products'], []), true);
  assert.equal(
    toolMatchesSelection(deepTool, ['Products'], ['Harnesses']),
    true
  );
  assert.equal(
    toolMatchesSelection(
      deepTool,
      ['Products'],
      ['Harnesses', 'Standalone IDEs']
    ),
    true
  );
  assert.equal(
    toolMatchesSelection(deepTool, ['Products'], ['Harnesses', 'Other']),
    false
  );
  assert.equal(toolMatchesSelection(deepTool, ['Other'], []), false);
  assert.equal(
    toolMatchesSelection(deepTool, ['Products', 'LLMs'], ['Harnesses']),
    true
  );

  const shallow = { category: 'LLMs', subcategory: 'Acme' };
  assert.deepEqual(toolGroups(shallow), ['LLMs', 'Acme']);
  assert.equal(toolMatchesSelection(shallow, ['LLMs'], ['Acme']), true);

  const direct = {
    category: 'Agent Services',
    subcategory: '__NO_SUBCATEGORY__',
  };
  assert.deepEqual(toolGroups(direct), ['Agent Services']);
  assert.equal(toolMatchesSelection(direct, ['Agent Services'], []), true);
  assert.equal(
    toolMatchesSelection(direct, ['Agent Services'], ['Acme']),
    false
  );
});

void test('shared URLs keep subcategory and add group for deeper levels', () => {
  const params = new URLSearchParams(
    'category=Products&subcategory=Harnesses&group=Standalone+IDEs&group=Extra'
  );
  assert.deepEqual(pathFromSearchParams(params, true), [
    'Harnesses',
    'Standalone IDEs',
    'Extra',
  ]);
  assert.deepEqual(pathFromSearchParams(params, false), []);

  const ignored = new URLSearchParams('group=Extra');
  assert.deepEqual(pathFromSearchParams(ignored, true), []);

  const written = new URLSearchParams();
  appendPathParams(written, ['Harnesses', 'Standalone IDEs']);
  assert.equal(written.get('subcategory'), 'Harnesses');
  assert.deepEqual(written.getAll('group'), ['Standalone IDEs']);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendNestedParams,
  appendPathParams,
  browseCategories,
  buildFilterRows,
  clearNested,
  isTransparentWrapper,
  nestedFromSearchParams,
  pathFromSearchParams,
  resolveBrowseQuery,
  tagsForSelection,
  toggleNested,
  toolBrowseGroups,
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
  assert.deepEqual(twoLevel[0].selected, []);

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
  assert.deepEqual(selectedLeaf[0].selected, ['Acme']);

  const deeper = buildFilterRows({
    category: deep,
    selectedPath: ['Harnesses', 'Standalone IDEs'],
    tags,
    selectedTags: [],
  });
  assert.deepEqual(kinds(deeper), ['groups', 'groups', 'groups', 'tags']);
  assert.deepEqual(
    deeper.filter((row) => row.kind === 'groups').map((row) => row.selected),
    [['Harnesses'], ['Standalone IDEs'], []]
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
  assert.deepEqual(atFourth[2].selected, ['Extra']);
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
  assert.equal(
    toolMatchesSelection(
      { category: 'LLMs', subcategory: 'Acme' },
      ['Products', 'LLMs'],
      []
    ),
    false
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

function leaf(name, description, entries) {
  return {
    name,
    description,
    children: {},
    tools: entries.map((entry) => ({ name: entry })),
  };
}

// products/ mixes flat sections and sections that have subclasses. That is the
// transparent wrapper. Agent Services and LLMs are uniform, so they stay.
const ecosystem = {
  'Agent Services': {
    name: 'Agent Services',
    description: 'Services',
    children: {
      Sales: leaf('Sales', 'CRM', ['Clay']),
      Design: leaf('Design', 'Media', ['Krea']),
    },
  },
  LLMs: {
    name: 'LLMs',
    description: 'Models',
    children: {
      OpenAI: leaf('OpenAI', '', ['GPT']),
      Anthropic: leaf('Anthropic', '', ['Claude']),
    },
  },
  'Terminal Products': {
    name: 'Terminal Products',
    description: 'Wrapper',
    children: {
      'General Chat': leaf('General Chat', 'Chat', ['ChatGPT']),
      'Coding Agents': {
        name: 'Coding Agents',
        description: 'Code',
        children: {
          'Terminal CLIs': leaf('Terminal CLIs', 'Shells', ['Claude Code']),
          'Standalone IDEs': leaf('Standalone IDEs', 'Editors', ['Cursor']),
        },
      },
      'Personal Agents': {
        name: 'Personal Agents',
        description: 'Named',
        children: {
          Desktop: leaf('Desktop', '', ['ChatGPT Desktop']),
        },
      },
    },
  },
  Standards: {
    name: 'Standards',
    description: 'Protocols',
    children: {},
    tools: [{ name: 'MCP' }],
  },
};

const flatTools = [
  {
    groups: ['Terminal Products', 'Personal Agents', 'Desktop'],
    tags: ['skills', 'desktop'],
  },
  {
    groups: ['Terminal Products', 'Coding Agents', 'Terminal CLIs'],
    tags: ['plugin'],
  },
  { groups: ['Agent Services', 'Sales'], tags: ['skill', 'mcp'] },
  { groups: ['Agent Services', 'Design'], tags: ['mcp'] },
  { groups: ['LLMs', 'OpenAI'], tags: ['api'] },
  { groups: ['Standards'], tags: [] },
];

void test('a mixed products directory unwraps and uniform categories do not', () => {
  assert.equal(isTransparentWrapper(ecosystem['Terminal Products']), true);
  assert.equal(isTransparentWrapper(ecosystem['Agent Services']), false);
  assert.equal(isTransparentWrapper(ecosystem.LLMs), false);
  assert.equal(isTransparentWrapper(ecosystem.Standards), false);
  assert.equal(
    isTransparentWrapper(
      ecosystem['Terminal Products'].children['Coding Agents']
    ),
    false
  );
  assert.equal(isTransparentWrapper(deep), false);

  const browse = browseCategories(ecosystem);
  assert.deepEqual(Object.keys(browse), [
    'Agent Services',
    'LLMs',
    'General Chat',
    'Coding Agents',
    'Personal Agents',
    'Standards',
  ]);
  assert.equal(browse['Terminal Products'], undefined);
  assert.equal(browse['Coding Agents'].description, 'Code');
});

void test('nested rows are multi-select and the next row is their combined children', () => {
  const services = {
    name: 'Agent Services',
    children: {
      Sales: {
        name: 'Sales',
        children: {
          Outbound: { name: 'Outbound', description: 'Outbound', children: {} },
        },
      },
      Design: {
        name: 'Design',
        children: {
          Video: { name: 'Video', description: 'Video', children: {} },
        },
      },
    },
  };
  const rows = buildFilterRows({
    category: services,
    selectedNested: [['Design', 'Sales']],
    tags: [],
    selectedTags: [],
  });
  assert.deepEqual(kinds(rows), ['groups', 'groups']);
  assert.deepEqual(rows[0].selected, ['Sales', 'Design']);
  assert.deepEqual(
    rows[1].options.map((option) => option.name),
    ['Outbound', 'Video']
  );

  const coding = browseCategories(ecosystem)['Coding Agents'];
  const codingRows = buildFilterRows({
    category: coding,
    selectedNested: [['Standalone IDEs', 'Terminal CLIs']],
    tags: ['plugin'],
    selectedTags: ['plugin'],
  });
  assert.deepEqual(kinds(codingRows), ['groups', 'tags']);
  assert.deepEqual(codingRows[0].selected, [
    'Terminal CLIs',
    'Standalone IDEs',
  ]);
  assert.deepEqual(toggleNested([['Sales']], 0, 'Design'), [
    ['Sales', 'Design'],
  ]);
  assert.deepEqual(toggleNested([['Sales', 'Design'], ['Video']], 0, 'Sales'), [
    ['Design'],
  ]);
  assert.deepEqual(clearNested([['Sales', 'Design'], ['Video']], 0), []);
  assert.deepEqual(clearNested([['Sales'], ['Outbound']], 1), [['Sales']]);
});

void test('tags come only from the selected category and its nested selection', () => {
  assert.deepEqual(tagsForSelection(flatTools, ecosystem, '', []), []);
  assert.deepEqual(
    tagsForSelection(flatTools, ecosystem, 'Personal Agents', []),
    ['desktop', 'skills']
  );
  assert.deepEqual(
    tagsForSelection(flatTools, ecosystem, 'Agent Services', []),
    ['mcp', 'skill']
  );
  assert.deepEqual(
    tagsForSelection(flatTools, ecosystem, 'Agent Services', [['Design']]),
    ['mcp']
  );
  assert.deepEqual(
    tagsForSelection(flatTools, ecosystem, 'Coding Agents', [
      ['Standalone IDEs'],
    ]),
    []
  );
  assert.deepEqual(
    tagsForSelection(flatTools, ecosystem, 'Coding Agents', [
      ['Terminal CLIs'],
    ]),
    ['plugin']
  );
  assert.deepEqual(tagsForSelection(flatTools, ecosystem, 'Standards', []), []);

  const codingTool = flatTools[1];
  assert.deepEqual(toolBrowseGroups(codingTool, ecosystem), [
    'Coding Agents',
    'Terminal CLIs',
  ]);
  assert.equal(
    toolMatchesSelection(
      codingTool,
      ['Coding Agents'],
      [['Terminal CLIs']],
      ecosystem
    ),
    true
  );
  assert.equal(
    toolMatchesSelection(codingTool, ['Agent Services'], [], ecosystem),
    false
  );
  assert.equal(
    toolMatchesSelection(
      flatTools[0],
      ['Personal Agents'],
      [['Desktop']],
      ecosystem
    ),
    true
  );
});

void test('old multi-category URLs keep the most specific valid top-level category', () => {
  const both = new URLSearchParams(
    'category=Agent+Services&category=LLMs&subcategory=OpenAI&tag=api&tag=skill'
  );
  assert.deepEqual(resolveBrowseQuery(ecosystem, both), {
    category: 'LLMs',
    nested: [['OpenAI']],
    tags: ['api', 'skill'],
  });

  const tie = new URLSearchParams(
    'category=Nope&category=LLMs&category=Standards'
  );
  assert.equal(resolveBrowseQuery(ecosystem, tie).category, 'LLMs');
  assert.deepEqual(resolveBrowseQuery(ecosystem, tie).nested, []);

  const wrapped = new URLSearchParams(
    'category=Terminal+Products&category=Agent+Services&subcategory=Coding+Agents&group=Terminal+CLIs'
  );
  assert.deepEqual(resolveBrowseQuery(ecosystem, wrapped), {
    category: 'Coding Agents',
    nested: [['Terminal CLIs']],
    tags: [],
  });

  const wrapperOnly = new URLSearchParams('category=Terminal+Products');
  assert.equal(resolveBrowseQuery(ecosystem, wrapperOnly).category, '');

  const multiChild = new URLSearchParams(
    'category=Agent+Services&subcategory=Sales&subcategory=Design'
  );
  assert.deepEqual(resolveBrowseQuery(ecosystem, multiChild).nested, [
    ['Sales', 'Design'],
  ]);

  const chain = new URLSearchParams(
    'category=Products&subcategory=Harnesses&group=Standalone+IDEs&group=Extra'
  );
  assert.deepEqual(nestedFromSearchParams(chain), [
    ['Harnesses'],
    ['Standalone IDEs'],
    ['Extra'],
  ]);

  const written = new URLSearchParams();
  appendNestedParams(written, [
    ['Terminal CLIs', 'Standalone IDEs'],
    ['Extra'],
  ]);
  assert.deepEqual(written.getAll('subcategory'), [
    'Terminal CLIs',
    'Standalone IDEs',
  ]);
  assert.deepEqual(written.getAll('group'), ['1:Extra']);
  assert.deepEqual(nestedFromSearchParams(written), [
    ['Terminal CLIs', 'Standalone IDEs'],
    ['Extra'],
  ]);

  const single = new URLSearchParams();
  appendNestedParams(single, [['Harnesses'], ['Standalone IDEs']]);
  assert.equal(single.get('subcategory'), 'Harnesses');
  assert.deepEqual(single.getAll('group'), ['Standalone IDEs']);
});

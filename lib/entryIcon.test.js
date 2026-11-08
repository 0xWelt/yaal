import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attachEntryIcons,
  discoverIcon,
  iconCandidates,
  pickIconFromHtml,
} from './entryIcon.js';

const html = `
<html><head>
  <link rel="stylesheet" href="/app.css">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
  <link rel="icon" href="icons/favicon-32.png" sizes="32x32">
  <link rel="shortcut icon" href="/favicon.ico">
</head></html>
`;

void test('prefers rel=icon over apple-touch-icon and resolves relative hrefs', () => {
  assert.equal(
    pickIconFromHtml(html, 'https://example.com/docs/page'),
    'https://example.com/docs/icons/favicon-32.png'
  );
  assert.equal(
    pickIconFromHtml(
      '<link rel="apple-touch-icon" href="//cdn.example/apple.png">',
      'https://example.com/'
    ),
    'https://cdn.example/apple.png'
  );
  assert.equal(
    pickIconFromHtml(
      '<link rel="mask-icon" href="/mask.svg">',
      'https://example.com/'
    ),
    undefined
  );
  assert.equal(
    pickIconFromHtml('<p>no icons</p>', 'https://example.com/'),
    undefined
  );
});

void test('runtime candidates fall back to site favicon and apple-touch-icon', () => {
  assert.deepEqual(iconCandidates('https://example.com/app', undefined), [
    'https://example.com/favicon.ico',
    'https://example.com/apple-touch-icon.png',
  ]);
  assert.deepEqual(
    iconCandidates(
      'https://example.com/app',
      'https://example.com/favicon.ico'
    ),
    [
      'https://example.com/favicon.ico',
      'https://example.com/apple-touch-icon.png',
    ]
  );
  assert.deepEqual(
    iconCandidates('https://example.com/app', 'https://cdn.example/icon.png'),
    [
      'https://cdn.example/icon.png',
      'https://example.com/favicon.ico',
      'https://example.com/apple-touch-icon.png',
    ]
  );
  assert.deepEqual(iconCandidates('not a url'), []);
  assert.deepEqual(iconCandidates('javascript:alert(1)'), []);
});

void test('discoverIcon reads the page and ignores failed fetches', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  try {
    assert.equal(
      await discoverIcon('https://example.com/docs/page'),
      'https://example.com/docs/icons/favicon-32.png'
    );
  } finally {
    globalThis.fetch = original;
  }

  globalThis.fetch = async () => {
    throw new Error('offline');
  };
  try {
    assert.equal(await discoverIcon('https://example.com'), undefined);
  } finally {
    globalThis.fetch = original;
  }

  const tools = [{ url: 'https://example.com', name: 'Example' }];
  process.env.YAAL_SKIP_ICONS = '1';
  try {
    await attachEntryIcons(tools);
  } finally {
    delete process.env.YAAL_SKIP_ICONS;
  }
  assert.equal(tools[0].icon, undefined);
});

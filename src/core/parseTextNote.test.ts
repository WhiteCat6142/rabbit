import assert from 'assert';
import { describe, it } from 'vitest';
import { type Event as NostrEvent } from 'nostr-tools';

import parseTextNote, {
  resolveTagReference,
  type ParsedTextNoteNode,
  TagReference,
} from './parseTextNote';

describe('parseTextNote', () => {
  /*
  it('should fail if the given event is not text note', () => {
    assert.throws(() => {
      parseTextNote({
        id: '',
        sig: '',
        kind: 0,
        content: '{}',
        tags: [],
        created_at: 0,
        pubkey: '',
      });
    });
  });
  */

  it('should parse text note with the url with hash', () => {
    const parsed = parseTextNote('this is url\nhttps://github.com/syusui-s/rabbit/#readme #rabbit');

    const expected: ParsedTextNoteNode[] = [
      { type: 'PlainText', content: 'this is url\n' },
      { type: 'URL', content: 'https://github.com/syusui-s/rabbit/#readme' },
      { type: 'PlainText', content: ' ' },
      { type: 'HashTag', content: '#rabbit', tagName: 'rabbit' },
    ];

    assert.deepStrictEqual(parsed, expected);
  });

  it('should parse text note with the url with hash and hashtag', () => {
    const parsed = parseTextNote('this is url\nhttps://github.com/syusui-s/rabbit/#readme #rabbit');

    const expected: ParsedTextNoteNode[] = [
      { type: 'PlainText', content: 'this is url\n' },
      { type: 'URL', content: 'https://github.com/syusui-s/rabbit/#readme' },
      { type: 'PlainText', content: ' ' },
      { type: 'HashTag', content: '#rabbit', tagName: 'rabbit' },
    ];

    assert.deepStrictEqual(parsed, expected);
  });

  it('should parse text note which includes punycode URL', () => {
    const parsed = parseTextNote('This is Japanese domain: https://xn--p8j9a0d9c9a.xn--q9jyb4c/');

    const expected: ParsedTextNoteNode[] = [
      { type: 'PlainText', content: 'This is Japanese domain: ' },
      { type: 'URL', content: 'https://xn--p8j9a0d9c9a.xn--q9jyb4c/' },
    ];

    assert.deepStrictEqual(parsed, expected);
  });

  it('should parse text note which includes image URLs', () => {
    const parsed = parseTextNote(
      'https://i.gyazo.com/8f177b9953fdb9513ad00d0743d9c608.png\nhttps://i.gyazo.com/346ad7260f6a999720c2d13317ff795f.jpg',
    );

    const expected: ParsedTextNoteNode[] = [
      { type: 'URL', content: 'https://i.gyazo.com/8f177b9953fdb9513ad00d0743d9c608.png' },
      { type: 'PlainText', content: '\n' },
      { type: 'URL', content: 'https://i.gyazo.com/346ad7260f6a999720c2d13317ff795f.jpg' },
    ];

    assert.deepStrictEqual(parsed, expected);
  });

  it('should parse text note which includes URL with + symbol', () => {
    const parsed = parseTextNote('this is my page\nhttps://example.com/abc+def?q=ghi+jkl#lmn+opq');

    const expected: ParsedTextNoteNode[] = [
      { type: 'PlainText', content: 'this is my page\n' },
      { type: 'URL', content: 'https://example.com/abc+def?q=ghi+jkl#lmn+opq' },
    ];

    assert.deepStrictEqual(parsed, expected);
  });

  it('should parse text note which includes URL with + symbol', () => {
    const parsed = parseTextNote('I wrote this page\nhttps://example.com/test(test)?q=(q)#(h)');

    const expected: ParsedTextNoteNode[] = [
      { type: 'PlainText', content: 'I wrote this page\n' },
      {
        type: 'URL',
        content: 'https://example.com/test(test)?q=(q)#(h)',
      },
    ];

    assert.deepStrictEqual(parsed, expected);
  });

  it('should parse text note which includes wss URL', () => {
    const parsed = parseTextNote(
      'this is my using relays: wss://relay.damus.io, wss://relay.snort.social, ws://localhost:3000',
    );

    const expected: ParsedTextNoteNode[] = [
      { type: 'PlainText', content: 'this is my using relays: ' },
      { type: 'URL', content: 'wss://relay.damus.io' },
      { type: 'PlainText', content: ', ' },
      { type: 'URL', content: 'wss://relay.snort.social' },
      { type: 'PlainText', content: ', ' },
      { type: 'URL', content: 'ws://localhost:3000' },
    ];

    assert.deepStrictEqual(parsed, expected);
  });

  it('should ignore invalid URL', () => {
    const parsed = parseTextNote('ws://localhost:port');

    const expected: ParsedTextNoteNode[] = [
      { type: 'URL', content: 'ws://localhost' },
      { type: 'PlainText', content: ':port' },
    ];

    assert.deepStrictEqual(parsed, expected);
  });

  it('should parse text note with pubkey mentions', () => {
    const parsed = parseTextNote('this is pubkey\n#[0] #[1]');

    const expected: ParsedTextNoteNode[] = [
      { type: 'PlainText', content: 'this is pubkey\n' },
      { type: 'TagReference', tagIndex: 0, content: '#[0]' },
      { type: 'PlainText', content: ' ' },
      { type: 'TagReference', tagIndex: 1, content: '#[1]' },
    ];

    assert.deepStrictEqual(parsed, expected);
  });

  it('should parse text note which includes npub string', () => {
    const parsed = parseTextNote(
      'this is pubkey\nnpub1srf6g8v2qpnecqg9l2kzehmkg0ym5f5rtnlsj6lhl8r6pmhger7q5mtt3q\nhello',
    );

    const expected: ParsedTextNoteNode[] = [
      { type: 'PlainText', content: 'this is pubkey\n' },
      {
        type: 'Bech32Entity',
        content: 'npub1srf6g8v2qpnecqg9l2kzehmkg0ym5f5rtnlsj6lhl8r6pmhger7q5mtt3q',
        data: {
          type: 'npub',
          data: '80d3a41d8a00679c0105faac2cdf7643c9ba26835cff096bf7f9c7a0eee8c8fc',
        },
      },
      { type: 'PlainText', content: '\nhello' },
    ];

    assert.deepStrictEqual(parsed, expected);
  });
});

describe('resolveTagReference', () => {
  it('should resolve a tag reference refers a user', () => {
    const tagReference: TagReference = {
      type: 'TagReference',
      tagIndex: 1,
      content: '#[1]',
    };
    const dummyEvent: NostrEvent = {
      id: '',
      sig: '',
      kind: 1,
      content: '#[1]',
      tags: [
        ['p', '9366708117c4a7edf9178acdce538c95059b9eb3394808cdd90564094172d972'],
        ['p', '80d3a41d8a00679c0105faac2cdf7643c9ba26835cff096bf7f9c7a0eee8c8fc'],
      ],
      created_at: 1678377182,
      pubkey: '9366708117c4a7edf9178acdce538c95059b9eb3394808cdd90564094172d972',
    };
    const result = resolveTagReference(tagReference, dummyEvent);
    const expected = {
      type: 'MentionedUser',
      tagIndex: 1,
      content: '#[1]',
      pubkey: '80d3a41d8a00679c0105faac2cdf7643c9ba26835cff096bf7f9c7a0eee8c8fc',
    };

    assert.deepStrictEqual(result, expected);
  });

  it('should resolve a tag reference refers an other text note', () => {
    const tagReference: TagReference = {
      type: 'TagReference',
      tagIndex: 1,
      content: '#[1]',
    };
    const dummyEvent: NostrEvent = {
      id: '',
      sig: '',
      kind: 1,
      content: '',
      tags: [
        ['p', '80d3a41d8a00679c0105faac2cdf7643c9ba26835cff096bf7f9c7a0eee8c8fc'],
        ['e', 'b9cefcb857fa487d5794156e85b30a7f98cb21721040631210262091d86ff6f212', '', 'reply'],
      ],
      created_at: 1678377182,
      pubkey: '9366708117c4a7edf9178acdce538c95059b9eb3394808cdd90564094172d972',
    };
    const result = resolveTagReference(tagReference, dummyEvent);
    const expected = {
      type: 'MentionedEvent',
      tagIndex: 1,
      marker: 'reply',
      content: '#[1]',
      eventId: 'b9cefcb857fa487d5794156e85b30a7f98cb21721040631210262091d86ff6f212',
    };
    assert.deepStrictEqual(result, expected);
  });
});

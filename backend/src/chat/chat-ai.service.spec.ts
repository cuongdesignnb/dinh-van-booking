import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChatAiService } from './chat-ai.service';

const service = Object.create(ChatAiService.prototype) as ChatAiService;
const knowledge = { paths: new Map([['/phong-nghi/nha-san', 'Nhà sàn'], ['/lien-he', 'Liên hệ tư vấn']]) };

test('structured AI output is validated field by field', () => {
  const reply = service.parse(JSON.stringify({
    reply: 'Nhà sàn có phòng cho 4 khách.',
    handoff: true,
    handoffReason: 'price_quote',
    askContact: true,
    links: [
      { path: '/phong-nghi/nha-san?utm=1', title: 'Xem nhà sàn' },
      { path: 'https://evil.example/', title: 'Lừa đảo' },
      { path: '/phong-nghi/khong-ton-tai', title: 'Bịa' },
      { path: '/phong-nghi/nha-san', title: 'Trùng' },
    ],
  }), 'json_schema', knowledge);
  assert.equal(reply.reply, 'Nhà sàn có phòng cho 4 khách.');
  assert.equal(reply.handoff, true);
  assert.equal(reply.handoffReason, 'price_quote');
  assert.equal(reply.askContact, true);
  assert.deepEqual(reply.links, [{ path: '/phong-nghi/nha-san', title: 'Xem nhà sàn' }]);
});

test('unknown handoff reasons and fenced JSON are handled', () => {
  const reply = service.parse('```json\n{"reply":"Dạ","handoff":true,"handoffReason":"hack","askContact":false,"links":[]}\n```', 'json_object', knowledge);
  assert.equal(reply.reply, 'Dạ');
  assert.equal(reply.handoffReason, 'other');
});

test('plain text output degrades safely and empty output is rejected', () => {
  const reply = service.parse('<script>x</script>Chào bạn', 'text', knowledge);
  assert.equal(reply.reply, 'xChào bạn');
  assert.equal(reply.handoff, false);
  assert.deepEqual(reply.links, []);
  assert.throws(() => service.parse('{"reply":"   ","handoff":false}', 'json_schema', knowledge));
});

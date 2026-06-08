import { PromptBuilder } from './prompt.builder';
import { Character, Message, Story } from '../database/entities';

function mkChar(over: Partial<Character> = {}): Character {
  return {
    id: 1,
    storyId: 1,
    name: 'A',
    persona: '冷静、寡言',
    traits: ['冷静'],
    initialRelation: '陌生人',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  } as Character;
}

function mkMsg(id: number, role: Message['role'], content: string, target?: Message['target']): Message {
  return {
    id,
    sessionId: 1,
    role,
    content,
    target: target ?? null,
    createdAt: new Date(id),
  } as Message;
}

describe('PromptBuilder', () => {
  const story: Story = {
    id: 1,
    title: '测试故事',
    background: '一座深山中的古寺。',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Story;
  const self = mkChar({ id: 1, name: '林夕' });
  const peer = mkChar({ id: 2, name: '周远', initialRelation: '师兄' });

  it('composeSystem 包含故事背景与人物设定', () => {
    const pb = new PromptBuilder(null as never);
    const sys = pb.composeSystem({ story, self, peer, history: [] });
    expect(sys).toContain('深山中的古寺');
    expect(sys).toContain('林夕');
    expect(sys).toContain('周远');
    expect(sys).toContain('师兄');
  });

  it('trimHistory 总是保留 system 注入事件', () => {
    const pb = new PromptBuilder(null as never);
    const history: Message[] = [
      mkMsg(1, 'char_a', '在吗？'),
      mkMsg(2, 'char_b', '嗯。'),
      mkMsg(3, 'system', '【事件注入】雨突然下了起来'),
    ];
    const out = pb.trimHistory(history, 8000, '雨突然下了起来');
    expect(out[0]).toMatchObject({ role: 'system' });
    expect(out[0].content).toContain('事件注入');
  });

  it('trimHistory 超预算时按时间丢弃更早消息', () => {
    const pb = new PromptBuilder(null as never);
    const huge: Message[] = [];
    for (let i = 1; i <= 200; i++) {
      huge.push(mkMsg(i, i % 2 === 0 ? 'char_b' : 'char_a', 'x'.repeat(200)));
    }
    const out = pb.trimHistory(huge, 500);
    // 裁剪后必须 ≤ 预算（用 char 估算）
    const totalChars = out.reduce((s, m) => s + m.content.length, 0);
    expect(totalChars).toBeLessThanOrEqual(500 + 200 /* buffer */);
    // 末尾消息应保留
    expect(out[out.length - 1].content.length).toBeGreaterThan(0);
  });

  it('trimHistory 空历史应返回空数组', () => {
    const pb = new PromptBuilder(null as never);
    const out = pb.trimHistory([], 1000);
    expect(out).toEqual([]);
  });
});

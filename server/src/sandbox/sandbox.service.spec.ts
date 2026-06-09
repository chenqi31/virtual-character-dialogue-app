import { EventEmitter2 } from '@nestjs/event-emitter';
import { SandboxService } from './sandbox.service';
import { Character, Message, Session, Story } from '../database/entities';

function makeStorageMock(over: Partial<{ session: Session; story: Story; self: Character; peer: Character; messages: Message[] }> = {}) {
  const session: Session = over.session ?? ({
    id: 1,
    storyId: 1,
    charAId: 1,
    charBId: 2,
    mode: 'sandbox',
    state: 'running',
    maxRounds: 3,
    currentRound: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Session);
  const story: Story = over.story ?? ({
    id: 1,
    title: 'T',
    background: 'B',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Story);
  const self: Character = over.self ?? ({
    id: 1, storyId: 1, name: 'A', persona: 'pa', traits: [], initialRelation: '',
    createdAt: new Date(), updatedAt: new Date(),
  } as Character);
  const peer: Character = over.peer ?? ({
    id: 2, storyId: 1, name: 'B', persona: 'pb', traits: [], initialRelation: '',
    createdAt: new Date(), updatedAt: new Date(),
  } as Character);
  const messages = over.messages ?? [];
  const storage: any = {
    getSession: jest.fn().mockResolvedValue(session),
    getStory: jest.fn().mockResolvedValue(story),
    getCharacter: jest.fn().mockImplementation((id: number) =>
      Promise.resolve(id === self.id ? self : peer),
    ),
    listMessages: jest.fn().mockResolvedValue(messages),
    appendMessage: jest.fn().mockResolvedValue(undefined),
    updateSessionState: jest.fn().mockImplementation(async (id: number, state: any) => {
      session.state = state;
      return session;
    }),
  };
  storage.incrementRound = jest.fn().mockImplementation(async (id: number) => {
    session.currentRound += 1;
    if (session.currentRound >= session.maxRounds) {
      session.state = 'ended';
      storage.updateSessionState(id, 'ended');
    }
    return session;
  });
  return storage;
}

function makeLlmMock(chunks: string[]) {
  return {
    stream: () => ({
      [Symbol.asyncIterator]: async function* () {
        for (const c of chunks) yield { delta: c, done: false };
        yield { delta: '', done: true };
      },
      abort: () => undefined,
    }),
  } as any;
}

describe('SandboxService（事件驱动）', () => {
  it('A.replied 触发 B 一次生成，消息入库并 emit B.replied', async () => {
    const storage = makeStorageMock();
    const llm = makeLlmMock(['你好。']);
    const events = new EventEmitter2();
    const pb = { build: () => ({ system: 's', history: [] }) } as any;
    const svc = new SandboxService(storage, llm, pb, events);

    const onB = jest.fn();
    events.on('sandbox.B.replied', onB);
    events.emit('sandbox.A.replied', { sessionId: 1, target: 'a' });

    // 等待 400ms 防刷屏延迟 + 一次微任务
    await new Promise((r) => setTimeout(r, 500));

    expect(storage.appendMessage).toHaveBeenCalledWith(expect.objectContaining({ role: 'char_b' }));
    expect(storage.incrementRound).toHaveBeenCalledWith(1);
    expect(onB).toHaveBeenCalled();
  });

  it('达到 maxRounds 时状态切到 ended', async () => {
    const storage = makeStorageMock({
      session: { ...({} as Session), id: 2, storyId: 1, charAId: 1, charBId: 2, mode: 'sandbox', state: 'running', maxRounds: 1, currentRound: 0 } as Session,
    });
    const llm = makeLlmMock(['嗯。']);
    const events = new EventEmitter2();
    const pb = { build: () => ({ system: 's', history: [] }) } as any;
    const svc = new SandboxService(storage, llm, pb, events);

    events.emit('sandbox.A.replied', { sessionId: 2, target: 'a' });
    await new Promise((r) => setTimeout(r, 500));

    expect(storage.updateSessionState).toHaveBeenCalledWith(2, 'ended');
  });
});

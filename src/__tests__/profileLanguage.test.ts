import { setLanguageApi } from '../lib/api';
import { syncProfileLanguage } from '../lib/profileLanguage';
import { useTierStore } from '../store/useTierStore';

jest.mock('../lib/api', () => ({ setLanguageApi: jest.fn(async () => undefined) }));
const send = setLanguageApi as jest.Mock;
const profile = { id: 'p1', pseudo: 'Ana', tag: 1234, avatar: '', secret: 'secret-1' };

describe('the profile’s language, for the notifications friends trigger', () => {
  beforeEach(() => {
    send.mockClear();
    useTierStore.setState({ profile: profile as never });
    useTierStore.getState().updateSettings({ language: 'auto' });
  });

  it('is sent once, then again only when it changes', async () => {
    await syncProfileLanguage();
    await syncProfileLanguage();
    useTierStore.getState().updateSettings({ language: 'el' });
    await syncProfileLanguage();
    expect(send.mock.calls).toEqual([
      ['secret-1', 'fr'],
      ['secret-1', 'el'],
    ]);
  });

  it('is sent again after a failure', async () => {
    useTierStore.getState().updateSettings({ language: 'es' });
    send.mockRejectedValueOnce(new Error('offline'));
    await syncProfileLanguage();
    await syncProfileLanguage();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('waits for a profile', async () => {
    useTierStore.setState({ profile: null });
    useTierStore.getState().updateSettings({ language: 'en' });
    await syncProfileLanguage();
    expect(send).not.toHaveBeenCalled();
  });
});

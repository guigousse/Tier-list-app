import { router } from 'expo-router';
import { Alert } from 'react-native';

import { useMail, type Mail } from '../store/useMail';
import { useTierStore } from '../store/useTierStore';
import { ignoreMail, reportMail, rerankMail } from './api';
import { t } from './i18n/useT';
import { socialError } from './social';

/** Opens a received list to rank (copied into the player's lists the first time). */
export function openReceived(mail: Mail, again = false): void {
  const id = useTierStore.getState().receiveMail({ id: mail.id, from: mail.friend.pseudo, list: mail.list }, again);
  router.push({ pathname: '/editor/[id]', params: { id } });
}

/** Ranks a received list again: back to rank, the friend waits for the new ranking. */
export function confirmRerank(mail: Mail): void {
  const secret = useTierStore.getState().profile?.secret;
  if (!secret) return;
  Alert.alert(t('social.rerankTitle'), t('social.rerankBody', { name: mail.friend.pseudo }), [
    { text: t('social.cancel'), style: 'cancel' },
    {
      text: t('social.rerank'),
      onPress: () =>
        rerankMail(secret, mail.id).then(
          async () => {
            await useMail.getState().refresh();
            router.back();
            openReceived({ ...mail, status: 'sent' }, true);
          },
          (e) => Alert.alert(t('social.oops'), socialError(e)),
        ),
    },
  ]);
}

/** Opens a list sent or received: to rank, or both rankings side by side. */
export function openMail(mail: Mail, received: boolean): void {
  if (received && mail.status === 'sent') openReceived(mail);
  else router.push({ pathname: '/mail/[id]', params: { id: mail.id } });
}

/** Removes a received list from the inbox, without telling the friend. */
export function confirmIgnore(mail: Mail): void {
  const secret = useTierStore.getState().profile?.secret;
  if (!secret) return;
  Alert.alert(t('social.ignoreTitle'), t('social.ignoreBody', { title: mail.list.title, name: mail.friend.pseudo }), [
    { text: t('social.cancel'), style: 'cancel' },
    {
      text: t('social.ignore'),
      style: 'destructive',
      onPress: () => ignoreMail(secret, mail.id).then(() => useMail.getState().refresh(), (e) => Alert.alert(t('social.oops'), socialError(e))),
    },
  ]);
}

/** Reports a received list: its sender is reported and blocked. */
export function confirmReportMail(mail: Mail): void {
  const secret = useTierStore.getState().profile?.secret;
  if (!secret) return;
  Alert.alert(
    t('social.reportMailTitle'),
    t('social.reportMailBody', { name: mail.friend.pseudo }),
    [
      { text: t('social.cancel'), style: 'cancel' },
      {
        text: t('social.report'),
        style: 'destructive',
        onPress: () =>
          reportMail(secret, mail.id).then(
            () => {
              useMail.getState().refresh();
              Alert.alert(t('social.thanks'), t('social.reportMailSent'));
            },
            (e) => Alert.alert(t('social.oops'), socialError(e)),
          ),
      },
    ],
  );
}

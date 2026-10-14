import { router } from 'expo-router';
import { Alert } from 'react-native';

import { useMail, type Mail } from '../store/useMail';
import { useTierStore } from '../store/useTierStore';
import { ignoreMail, reportMail, rerankMail } from './api';
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
  Alert.alert('Reclasser cette liste ?', `${mail.friend.pseudo} verra votre nouveau classement une fois envoyé.`, [
    { text: 'Annuler', style: 'cancel' },
    {
      text: 'Reclasser',
      onPress: () =>
        rerankMail(secret, mail.id).then(
          async () => {
            await useMail.getState().refresh();
            router.back();
            openReceived({ ...mail, status: 'sent' }, true);
          },
          (e) => Alert.alert('Oups', socialError(e)),
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
  Alert.alert('Ignorer cette liste ?', `« ${mail.list.title} » disparaîtra de vos listes reçues, sans prévenir ${mail.friend.pseudo}.`, [
    { text: 'Annuler', style: 'cancel' },
    {
      text: 'Ignorer',
      style: 'destructive',
      onPress: () => ignoreMail(secret, mail.id).then(() => useMail.getState().refresh(), (e) => Alert.alert('Oups', socialError(e))),
    },
  ]);
}

/** Reports a received list: its sender is reported and blocked. */
export function confirmReportMail(mail: Mail): void {
  const secret = useTierStore.getState().profile?.secret;
  if (!secret) return;
  Alert.alert(
    'Signaler cette liste ?',
    `Le profil de ${mail.friend.pseudo} sera signalé et bloqué : vous ne serez plus amis, et ses listes ne vous parviendront plus.`,
    [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Signaler',
        style: 'destructive',
        onPress: () =>
          reportMail(secret, mail.id).then(
            () => {
              useMail.getState().refresh();
              Alert.alert('Merci', 'Le signalement est envoyé.');
            },
            (e) => Alert.alert('Oups', socialError(e)),
          ),
      },
    ],
  );
}

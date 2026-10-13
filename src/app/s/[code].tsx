import { Redirect, useLocalSearchParams } from 'expo-router';

/** Short share link (https://…/s/CODE or tiercraft://s/CODE): hands the code to the import screen. */
export default function ShortLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Redirect href={{ pathname: '/import', params: { c: code } }} />;
}

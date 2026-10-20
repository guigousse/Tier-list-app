-- The French notifications speak to the player as the app does: "tu", not "vous".
update private.push_texts as p set text = v.text
from (values
  ('disagree.title', '{p} n’est pas d’accord avec toi ⚔️'),
  ('disagree.body', '{p} a classé « {t} » : seulement {s} % d’accord. Voyez qui a raison !'),
  ('agree.title', '{p} est d’accord avec toi 🤝'),
  ('ranked.body', '{s} % d’accord avec toi. Comparez vos classements !'),
  ('mail.title', '{p} t’a envoyé une tier list 📬'),
  ('mail.ranked', '« {t} » : tu l’avais déjà classée, comparez vos classements !'),
  ('mail.new', '« {t} » : classe-la et comparez vos goûts.')
) as v(key, text)
where p.lang = 'fr' and p.key = v.key;

const ON_CLOSED_CLASS = Object.create(null);
function _addON(forms, e) {
  for (const f of forms) {
    if (!ON_CLOSED_CLASS[f]) ON_CLOSED_CLASS[f] = [];
    ON_CLOSED_CLASS[f].push(Object.assign({ id:0, form:f, gender:'', case_name:'', number:'', definiteness:'' }, e));
  }
}
_addON(['á'], { headword:'á', pos:'preposition', gov_cases:['ACC','DAT'], zoega_def:'prep. (acc./dat.) on, in, at' });
_addON(['í'], { headword:'í', pos:'preposition', gov_cases:['ACC','DAT'], zoega_def:'prep. (acc./dat.) in, into' });
_addON(['af'], { headword:'af', pos:'preposition', gov_cases:['DAT'], zoega_def:'prep. (dat.) of, from, by' });
_addON(['til'], { headword:'til', pos:'preposition', gov_cases:['GEN'], zoega_def:'prep. (gen.) to, towards, for' });
_addON(['við'], { headword:'við', pos:'preposition', gov_cases:['ACC','DAT'], zoega_def:'prep. (acc./dat.) against, with, at' });
_addON(['um'], { headword:'um', pos:'preposition', gov_cases:['ACC'], zoega_def:'prep. (acc.) around, about, across' });
_addON(['fyrir'], { headword:'fyrir', pos:'preposition', gov_cases:['ACC','DAT'], zoega_def:'prep. (acc./dat.) before, for' });
_addON(['með'], { headword:'með', pos:'preposition', gov_cases:['ACC','DAT'], zoega_def:'prep. (acc./dat.) with, by' });
_addON(['ór','úr'], { headword:'ór', pos:'preposition', gov_cases:['DAT'], zoega_def:'prep. (dat.) out of, from' });
_addON(['frá'], { headword:'frá', pos:'preposition', gov_cases:['DAT'], zoega_def:'prep. (dat.) from, away from' });
_addON(['hjá'], { headword:'hjá', pos:'preposition', gov_cases:['DAT'], zoega_def:'prep. (dat.) by, beside' });
_addON(['undir'], { headword:'undir', pos:'preposition', gov_cases:['ACC','DAT'], zoega_def:'prep. (acc./dat.) under' });
_addON(['yfir'], { headword:'yfir', pos:'preposition', gov_cases:['ACC','DAT'], zoega_def:'prep. (acc./dat.) over, above' });
_addON(['eptir','eftir'], { headword:'eptir', pos:'preposition', gov_cases:['ACC','DAT'], zoega_def:'prep. (acc./dat.) after, along' });
_addON(['móti','ímóti'], { headword:'móti', pos:'preposition', gov_cases:['DAT'], zoega_def:'prep. (dat.) against, towards' });
_addON(['án'], { headword:'án', pos:'preposition', gov_cases:['GEN'], zoega_def:'prep. (gen.) without' });
_addON(['milli','millum','ímilli'], { headword:'milli', pos:'preposition', gov_cases:['GEN'], zoega_def:'prep. (gen.) between, among' });
_addON(['at'], { headword:'at', pos:'preposition / conjunction', gov_cases:['DAT'], zoega_def:'prep. (dat.) at, to; conj. that' });
_addON(['ok','en','er','sem','ef','þó','þótt','áðr','síðan','meðan','eða','eðr','né','bæði'], { headword:'conjunction', pos:'conjunction', zoega_def:'Old Norse conjunction / relative particle' });
_addON(['eigi','ekki','æva','svá','nú','hér','þar','hvar','upp','niðr','út','inn','fram','aptr','vel','illa','mjǫk','mjök'], { headword:'adverb', pos:'adverb', zoega_def:'Old Norse adverb' });
const _ON_DETS = [
  ['hinn','hinn','m.','NOM','SG'],['hinn','hinn','m.','ACC','SG'],['hin','hinn','f.','NOM','SG'],['hin','hinn','n.','NOM','PL'],['hin','hinn','n.','ACC','PL'],
  ['hit','hinn','n.','NOM','SG'],['hit','hinn','n.','ACC','SG'],['hið','hinn','n.','NOM','SG'],['hið','hinn','n.','ACC','SG'],
  ['hina','hinn','f.','ACC','SG'],['hinni','hinn','f.','DAT','SG'],['hinu','hinn','n.','DAT','SG'],['hinum','hinn','m.','DAT','SG'],['hinum','hinn','m.','DAT','PL'],
  ['hins','hinn','m.','GEN','SG'],['hinnar','hinn','f.','GEN','SG'],['hinir','hinn','m.','NOM','PL'],['hinar','hinn','f.','NOM','PL'],['hinna','hinn','m.','GEN','PL'],
  ['sá','sá','m.','NOM','SG'],['sú','sá','f.','NOM','SG'],['þat','sá','n.','NOM','SG'],['þat','sá','n.','ACC','SG'],['þann','sá','m.','ACC','SG'],
  ['þá','sá','f.','ACC','SG'],['þeim','sá','m.','DAT','SG'],['þeim','sá','m.','DAT','PL'],['þeirri','sá','f.','DAT','SG'],['því','sá','n.','DAT','SG'],
  ['þess','sá','m.','GEN','SG'],['þeirrar','sá','f.','GEN','SG'],['þeir','sá','m.','NOM','PL'],['þær','sá','f.','NOM','PL'],['þau','sá','n.','NOM','PL']
];
for (const row of _ON_DETS) {
  const [f, hw, g, c, n] = row;
  _addON([f], { headword:hw, pos:'pronoun', gender:g, case_name:c, number:n, definiteness:'DEF', zoega_def:'demonstrative / definite article' });
}

const _ON_PRONS = [
  ['ek','ek','n.','NOM','SG','1st pers. pron. I'],['mik','ek','n.','ACC','SG','1st pers. pron. me'],['mér','ek','n.','DAT','SG','1st pers. pron. to me'],['mín','ek','n.','GEN','SG','1st pers. pron. of me'],
  ['þú','þú','n.','NOM','SG','2nd pers. pron. thou'],['þik','þú','n.','ACC','SG','2nd pers. pron. thee'],['þér','þú','n.','DAT','SG','2nd pers. pron. to thee'],['þín','þú','n.','GEN','SG','2nd pers. pron. of thee'],
  ['hann','hann','m.','NOM','SG','3rd pers. pron. he'],['hann','hann','m.','ACC','SG','3rd pers. pron. him'],['honum','hann','m.','DAT','SG','3rd pers. pron. to him'],['hans','hann','m.','GEN','SG','3rd pers. pron. his'],
  ['hon','hon','f.','NOM','SG','3rd pers. pron. she'],['hón','hon','f.','NOM','SG','3rd pers. pron. she'],['hana','hon','f.','ACC','SG','3rd pers. pron. her'],['henni','hon','f.','DAT','SG','3rd pers. pron. to her'],['hennar','hon','f.','GEN','SG','3rd pers. pron. her'],
  ['vér','vér','n.','NOM','PL','1st pers. pron. we'],['oss','vér','n.','ACC','PL','1st pers. pron. us'],['oss','vér','n.','DAT','PL','1st pers. pron. us'],['vár','vér','n.','GEN','PL','1st pers. pron. our'],
  ['hvat','hvat','n.','NOM','SG','interrogative pron. what'],['hvat','hvat','n.','ACC','SG','interrogative pron. what'],['hví','hvat','n.','DAT','SG','interrogative pron. why'],['hvers','hvat','n.','GEN','SG','interrogative pron. of what']
];
for (const row of _ON_PRONS) {
  const [f, hw, g, c, n, def] = row;
  _addON([f], { headword:hw, pos:'pronoun', gender:g, case_name:c, number:n, definiteness:'INDEF', zoega_def:def });
}

const _ON_ENCLITICS = [
  ['sáttu','sjá','PAST','2SG','(+ enclitic þú) v. to see (sátt + þú)'],
  ['segðu','segja','PRES','2SG','(+ enclitic þú) v. to say, tell (seg + þú)'],
  ['farðu','fara','PRES','2SG','(+ enclitic þú) v. to go, travel (far + þú)'],
  ['komðu','koma','PRES','2SG','(+ enclitic þú) v. to come (kom + þú)'],
  ['gefðu','gefa','PRES','2SG','(+ enclitic þú) v. to give (gef + þú)'],
  ['takðu','taka','PRES','2SG','(+ enclitic þú) v. to take (tak + þú)'],
  ['ertu','vera','PRES','2SG','(+ enclitic þú) v. to be (ert + þú)'],
  ['vartu','vera','PAST','2SG','(+ enclitic þú) v. to be (vart + þú)'],
  ['skaltu','skulu','PRES','2SG','(+ enclitic þú) v. shall, must (skalt + þú)'],
  ['muntu','munu','PRES','2SG','(+ enclitic þú) v. will, shall (munt + þú)'],
  ['máttu','mega','PRES','2SG','(+ enclitic þú) v. may, can (mátt + þú)'],
  ['viltu','vilja','PRES','2SG','(+ enclitic þú) v. to will, wish (vilt + þú)'],
  ['kanntu','kunna','PRES','2SG','(+ enclitic þú) v. to know, can (kannt + þú)'],
  ['veiztu','vita','PRES','2SG','(+ enclitic þú) v. to know (veizt + þú)'],
  ['áttu','eiga','PRES','2SG','(+ enclitic þú) v. to own, have (átt + þú)']
];
for (const row of _ON_ENCLITICS) {
  const [f, hw, c, n, def] = row;
  _addON([f], { headword:hw, pos:'verb', case_name:c, number:n, definiteness:'ENCLITIC', zoega_def:def });
}

_addON(['kallat','kallað','kallaðr'], { headword:'kalla', pos:'verb', case_name:'PAST', number:'PART', zoega_def:'(kallaða, kallaðr), v. to cry out, summon, call, name' });

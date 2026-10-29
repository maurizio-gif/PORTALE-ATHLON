import subprocess, shutil, os, sys
S='/private/tmp/claude-501/prova_classifica'
BASE='/private/tmp/claude-501/prova_mut'
muts=[
 ('punteggio.ts',"[0, 0.4, 1, 1, 1, 0.9, 0.8, 0.7]","[0, 0.5, 1, 1, 1, 0.9, 0.8, 0.7]",'curva: 1 giorno = 0,5'),
 ('punteggio.ts',"GIORNI_FOOD = 5","GIORNI_FOOD = 4",'Food: quattro giorni'),
 ('punteggio.ts',"if (g >= m0 && g <= fino) peso++","peso++",'settimane non pesate per i giorni nel mese'),
 ('punteggio.ts',"if (prima === null || s.fin < prima) continue","if (prima === null) continue",'settimane prima della prima attivita\' contano'),
 ('punteggio.ts',"const pesiInUso = PESI.train + (i.food ? PESI.food : 0) + (i.recover ? PESI.recover : 0)","const pesiInUso = PESI.train + PESI.food + PESI.recover",'pilastri non in uso penalizzano'),
 ('punteggio.ts',"minuti >= 420 ? 1","minuti >= 480 ? 1",'sette ore -> otto'),
 ('punteggio.ts',"spostaGiorno(i.oggi, -1)","spostaGiorno(i.oggi, 0)",'conta anche oggi'),
 ('punteggio.ts',"[...train].filter((g) => g >= m0 && g <= fino).length","[...train].filter((g) => g <= fino).length",'giorni attivi anche prima del mese'),
 ('righe.ts',"if (ultimi === null || c.punti !== ultimi) {","if (true) {",'niente parimerito'),
 ('righe.ts',"primi = 10, vicini = 2","primi = 10, vicini = 1",'un solo vicino'),
 ('righe.ts',"primi = 10, vicini = 2","primi = 5, vicini = 2",'prime cinque'),
 ('righe.ts',"id: r.riga_id,","id: r.riga_id, member_id: r.member_id,",'esce il member_id'),
 ('righe.ts',"d && !d.motto_nascosto ? d.motto : null","d ? d.motto : null",'esce il motto nascosto'),
 ('righe.ts',"giorni_rimasti: resta","giorni_rimasti: resta - 1",'giorni rimasti sbagliati'),
 ('righe.ts',".charAt(0).toLocaleUpperCase('it-IT')\n  if (!n","\n  if (!n",'cognome intero') ,
 ('motto.ts',"MOTTO_MAX = 80","MOTTO_MAX = 100",'motto 100'),
 ('motto.ts',"s.includes('@') || ","",'@ ammessa'),
 ('motto.ts',"if (TELEFONO.test(s))","if (false)",'telefono ammesso'),
 ('motto.ts',"const compatto = n.replace(/[^a-z]/g, '')","const compatto = ''",'niente parole con gli spazi in mezzo'),
 ('motto.ts',"'0': 'o', ","",'niente leet'),
 ('motto.ts',"'shit', 'bitch'","'kill', 'bitch'",'shit tolto / kill aggiunto'),
 ('versione.ts',"'2026-10-29'","'2026-10-30'",'versione diversa'),
]
vivi=0
for f,a,b,nome in muts:
    if os.path.exists(BASE): shutil.rmtree(BASE)
    shutil.copytree(S,BASE)
    p=f'{BASE}/supabase/functions/_shared/classifica/{f}'
    s=open(p,encoding='utf-8').read()
    if a not in s:
        print('NON TROVATA', f, nome); continue
    open(p,'w',encoding='utf-8').write(s.replace(a,b,1))
    r=subprocess.run(['node','--experimental-strip-types','supabase/functions/_prove/classifica.ts'],cwd=BASE,capture_output=True,text=True)
    esito='RILEVATA' if r.returncode!=0 else 'SOPRAVVISSUTA'
    if r.returncode==0: vivi+=1
    print(f'{esito:14} {f:13} {nome}')
print('sopravvissute:',vivi,'su',len(muts))

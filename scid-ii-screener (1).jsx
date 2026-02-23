import { useState, useRef, useEffect } from "react";

const DISORDERS = {
  avoidant: { name: "Unikające", nameEn: "Avoidant", color: "#6366f1", threshold: 4, questions: [] },
  dependent: { name: "Zależne", nameEn: "Dependent", color: "#8b5cf6", threshold: 5, questions: [] },
  ocpd: { name: "Obsesyjno-kompulsywne", nameEn: "OCPD", color: "#3b82f6", threshold: 4, questions: [] },
  passiveAggressive: { name: "Bierno-agresywne", nameEn: "Passive-Aggressive", color: "#0ea5e9", threshold: 4, questions: [] },
  depressive: { name: "Depresyjne", nameEn: "Depressive", color: "#475569", threshold: 5, questions: [] },
  paranoid: { name: "Paranoiczne", nameEn: "Paranoid", color: "#ef4444", threshold: 4, questions: [] },
  schizotypal: { name: "Schizotypowe", nameEn: "Schizotypal", color: "#f97316", threshold: 4, questions: [] },
  schizoid: { name: "Schizoidalne", nameEn: "Schizoid", color: "#64748b", threshold: 4, questions: [] },
  histrionic: { name: "Histrioniczne", nameEn: "Histrionic", color: "#ec4899", threshold: 4, questions: [] },
  narcissistic: { name: "Narcystyczne", nameEn: "Narcissistic", color: "#f59e0b", threshold: 5, questions: [] },
  borderline: { name: "Z pogranicza (BPD)", nameEn: "Borderline", color: "#dc2626", threshold: 5, questions: [] },
  antisocial: { name: "Antyspołeczne", nameEn: "Antisocial", color: "#1e293b", threshold: 3, questions: [] },
};

const QUESTIONS = [
  // AVOIDANT 1-7
  { id: 1, text: "Czy unika Pan (Pani) prac lub zadań, przy których trzeba mieć kontakt z dużą liczbą osób?", disorder: "avoidant" },
  { id: 2, text: "Czy unika Pan (Pani) bliższych kontaktów z ludźmi, jeśli nie jest Pan (Pani) pewny (pewna), że Pana (Panią) polubią?", disorder: "avoidant" },
  { id: 3, text: "Czy trudno jest Panu (Pani) 'otworzyć się' nawet wobec bliskich osób?", disorder: "avoidant" },
  { id: 4, text: "Czy często martwi się Pan (Pani) tym, że w sytuacjach towarzyskich ktoś Pana (Panią) skrytykuje lub odrzuci?", disorder: "avoidant" },
  { id: 5, text: "Czy zazwyczaj milczy Pan (Pani), gdy poznaje nowych ludzi?", disorder: "avoidant" },
  { id: 6, text: "Czy uważa Pan (Pani), że nie jest tak mądry (mądra), tak dobry (dobra) lub tak atrakcyjny (atrakcyjna), jak większość innych ludzi?", disorder: "avoidant" },
  { id: 7, text: "Czy boi się Pan (Pani) próbowania nowych rzeczy?", disorder: "avoidant" },

  // DEPENDENT 8-14
  { id: 8, text: "Czy potrzebuje Pan (Pani) dużo rad i upewnień ze strony innych, zanim podejmie Pan (Pani) jakąś decyzję w codziennym życiu, np. w co się ubrać, co zamówić w restauracji?", disorder: "dependent" },
  { id: 9, text: "Czy polega Pan (Pani) na innych osobach w sprawach dotyczących swojego życia, jak np. finanse, opieka nad dziećmi, plany na przyszłość?", disorder: "dependent" },
  { id: 10, text: "Czy trudno jest Panu (Pani) nie zgodzić się z ludźmi, nawet jeśli — według Pana (Pani) — nie mają racji?", disorder: "dependent" },
  { id: 11, text: "Czy trudno jest Panu (Pani) zacząć pracować, jeśli nie można liczyć na pomoc innych?", disorder: "dependent" },
  { id: 12, text: "Czy często podejmuje się Pan (Pani) wykonania zadań, które są nieprzyjemne?", disorder: "dependent" },
  { id: 13, text: "Czy czuje się Pan (Pani) nieswojo, będąc sam (sama)?", disorder: "dependent" },
  { id: 14, text: "Czy kiedy kończy się związek, od razu musi Pan (Pani) znaleźć kogoś, kto się Panem (Panią) zatroszczy?", disorder: "dependent" },

  // OCPD 15-23
  { id: 15, text: "Czy często martwi się Pan (Pani), że zostanie sam (sama) i sam (sama) będzie musiał (musiała) się o siebie troszczyć?", disorder: "ocpd" },
  { id: 16, text: "Czy skupia się Pan (Pani) na szczegółach, porządku i organizacji lub czy czuje Pan (Pani) potrzebę robienia list i planów?", disorder: "ocpd" },
  { id: 17, text: "Czy ma Pan (Pani) trudności z zakończeniem pracy z powodu ilości czasu poświęcanego na wykonanie jej dokładnie i poprawnie?", disorder: "ocpd" },
  { id: 18, text: "Czy Pan (Pani) lub inni ludzie sądzą, że jest Pan (Pani) tak pochłonięty (pochłonięta) pracą (lub nauką), że nie ma czasu dla nikogo innego, ani czasu na przyjemności?", disorder: "ocpd" },
  { id: 19, text: "Czy ma Pan (Pani) wysokie standardy dotyczące tego, co jest dobre, a co złe?", disorder: "ocpd" },
  { id: 20, text: "Czy ma Pan (Pani) trudności z wyrzuceniem rzeczy, 'bo mogą się jeszcze kiedyś przydać'?", disorder: "ocpd" },
  { id: 21, text: "Czy trudno jest Panu (Pani) przyjąć pomoc innych ludzi, chyba że osoby te godzą się działać ściśle według Pana (Pani) poleceń?", disorder: "ocpd" },
  { id: 22, text: "Czy trudno jest Panu (Pani) wydawać pieniądze na siebie lub na innych, nawet jeśli ma ich Pan (Pani) pod dostatkiem?", disorder: "ocpd" },
  { id: 23, text: "Czy jest Pan (Pani) często tak przekonany (przekonana) o własnej racji, że nie ma znaczenia, co myślą inni?", disorder: "ocpd" },

  // PASSIVE-AGGRESSIVE 24-28
  { id: 24, text: "Czy inni ludzie mówią, że jest Pan (Pani) uparty (uparta) lub nieugięty (nieugięta)?", disorder: "passiveAggressive" },
  { id: 25, text: "Czy jeśli ktoś poprosi o wykonanie jakiegoś zadania, na które nie ma Pan (Pani) ochoty, zgadza się Pan (Pani), a potem pracuje powoli i niedokładnie?", disorder: "passiveAggressive" },
  { id: 26, text: "Czy jeśli nie chce Pan (Pani) czegoś zrobić, 'zapomina' Pan (Pani) o tym?", disorder: "passiveAggressive" },
  { id: 27, text: "Czy często czuje Pan (Pani), że inni Pana (Pani) nie rozumieją lub niedoceniają tego, co Pan (Pani) robi?", disorder: "passiveAggressive" },
  { id: 28, text: "Czy często jest Pan (Pani) zrzędliwy (zrzędliwa) i wdaje się w kłótnie?", disorder: "passiveAggressive" },

  // DEPRESSIVE 29-35
  { id: 29, text: "Czy uważa Pan (Pani), że większość szefów, nauczycieli, zwierzchników, lekarzy i innych osób, które powinny wiedzieć, co robią, w rzeczywistości tego nie wie?", disorder: "depressive" },
  { id: 30, text: "Czy często myśli Pan (Pani), o tym, że to niesprawiedliwe, że innym lepiej się powodzi?", disorder: "depressive" },
  { id: 31, text: "Czy często skarży się Pan (Pani) na to, że przydarza się Panu (Pani) więcej złych rzeczy niż innym?", disorder: "depressive" },
  { id: 32, text: "Czy często gniewnie odmawia Pan (Pani) zrobienia czegoś, o co poprosili inni, a potem żałuje i przeprasza?", disorder: "depressive" },
  { id: 33, text: "Czy zazwyczaj czuje się Pan (Pani) nieszczęśliwy (nieszczęśliwa) lub myśli, że życie nie jest przyjemne?", disorder: "depressive" },
  { id: 34, text: "Czy sądzi Pan (Pani), że nie pasuje do innych i często czuje się źle ze sobą?", disorder: "depressive" },
  { id: 35, text: "Czy często popada Pan (Pani) w przygnębienie?", disorder: "depressive" },

  // PARANOID 36-48
  { id: 36, text: "Czy stale myśli Pan (Pani) o przykrych rzeczach jakie spotkały Pana (Panią) w przeszłości, lub martwi się Pan (Pani) o to co się stanie?", disorder: "paranoid" },
  { id: 37, text: "Czy często ocenia Pan (Pani) innych surowo i dostrzega ich winy?", disorder: "paranoid" },
  { id: 38, text: "Czy uważa Pan (Pani), że większość ludzi jest do niczego?", disorder: "paranoid" },
  { id: 39, text: "Czy zawsze oczekuje Pan (Pani), że wydarzy się coś złego?", disorder: "paranoid" },
  { id: 40, text: "Czy często czuje się Pan (Pani) winny (winna) z powodu tego, co Pan (Pani) zrobił (zrobiła) albo czego nie zrobił (zrobiła)?", disorder: "paranoid" },
  { id: 41, text: "Czy często musi się Pan (Pani) mieć na baczności, aby inni ludzie Pana (Pani) nie wykorzystali lub nie skrzywdzili?", disorder: "paranoid" },
  { id: 42, text: "Czy spędza Pan (Pani) dużo czasu zastanawiając się, czy może ufać swoim przyjaciołom lub ludziom, z którymi Pan (Pani) pracuje?", disorder: "paranoid" },
  { id: 43, text: "Czy uważa Pan (Pani), że to dobrze, jeśli ludzie nie wiedzą o Panu (Pani) zbyt wiele, ponieważ mogliby to przeciwko Panu (Pani) wykorzystać?", disorder: "paranoid" },
  { id: 44, text: "Czy często tropi Pan (Pani) ukryte groźby lub zniewagi w tym, co ludzie mówią lub robią?", disorder: "paranoid" },
  { id: 45, text: "Czy jest Pan (Pani) osobą, która chowa urazy lub niechętnie przebacza ludziom, którzy w jakiś sposób Pana (Panią) zranili lub obrazili?", disorder: "paranoid" },
  { id: 46, text: "Czy jest wiele osób, którym nie może Pan (Pani) wybaczyć tego, co zrobiły dawno temu?", disorder: "paranoid" },
  { id: 47, text: "Czy łatwo wpada Pan (Pani) w gniew lub atakuje kogoś za krytykę lub zniewagę?", disorder: "paranoid" },
  { id: 48, text: "Czy podejrzewał Pan (podejrzewała Pani) lub podejrzewa, że partner (partnerka) bądź mąż (żona) Pana (Panią) zdradza?", disorder: "paranoid" },

  // SCHIZOTYPAL 49-57
  { id: 49, text: "Czy kiedy widzi Pan (Pani) rozmawiających ludzi, często myśli Pan (Pani), że rozmawiają o Panu (Pani)?", disorder: "schizotypal" },
  { id: 50, text: "Czy często ma Pan (Pani) uczucie, że rzeczy bez specjalnego znaczenia dla innych ludzi mają Panu (Pani) przekazać jakąś wiadomość?", disorder: "schizotypal" },
  { id: 51, text: "Czy gdy jest Pan (Pani) wśród ludzi, często ma Pan (Pani) wrażenie, że jest obserwowany (obserwowana)?", disorder: "schizotypal" },
  { id: 52, text: "Czy kiedykolwiek miał Pan (miała Pani) poczucie, że mógłby (mogłaby) sprawić, żeby coś się stało, myśląc o tym lub wypowiadając życzenie?", disorder: "schizotypal" },
  { id: 53, text: "Czy miał Pan (miała Pani) doświadczenia z mocami nadprzyrodzonymi?", disorder: "schizotypal" },
  { id: 54, text: "Czy wierzy Pan (Pani) w to, że ma 'szósty zmysł', który pozwala przewidywać rzeczy, jakich inni nie mogą przewidzieć?", disorder: "schizotypal" },
  { id: 55, text: "Czy zdarza się, że przedmioty lub cienie są dla Pana (Pani) ludźmi, a dźwięki — ludzkimi głosami?", disorder: "schizotypal" },
  { id: 56, text: "Czy miał Pan (miała Pani) kiedyś przeświadczenie, że jest ktoś lub coś, jakaś siła wokół Pana (Pani), chociaż nikogo Pan (Pani) nie widział (nie widziała)?", disorder: "schizotypal" },
  { id: 57, text: "Czy często widzi Pan (Pani) aurę lub pola energii wokół ludzi?", disorder: "schizotypal" },

  // SCHIZOID 58-63
  { id: 58, text: "Czy niewiele jest osób poza rodziną, które są Panu (Pani) bliskie?", disorder: "schizoid" },
  { id: 59, text: "Czy często denerwuje się Pan (Pani), gdy jest z innymi ludźmi?", disorder: "schizoid" },
  { id: 60, text: "Czy bliskie związki NIE są dla Pana (Pani) ważne?", disorder: "schizoid" },
  { id: 61, text: "Czy prawie zawsze woli Pan (Pani) wykonywać czynności sam (sama) niż z innymi ludźmi?", disorder: "schizoid" },
  { id: 62, text: "Czy mógłby Pan (mogłaby Pani) być zadowolony (zadowolona), nie utrzymując żadnego związku seksualnego?", disorder: "schizoid" },
  { id: 63, text: "Czy niewiele rzeczy sprawia Panu (Pani) tak naprawdę przyjemność?", disorder: "schizoid" },

  // HISTRIONIC 64-72
  { id: 64, text: "Czy NIE jest dla Pana (Pani) ważne, co ludzie o Panu (Pani) myślą?", disorder: "histrionic" },
  { id: 65, text: "Czy zauważył Pan (zauważyła Pani), że nic tak naprawdę Pana (Pani) nie uszczęśliwia ani nie smuci?", disorder: "histrionic" },
  { id: 66, text: "Czy lubi być Pan (Pani) w centrum uwagi?", disorder: "histrionic" },
  { id: 67, text: "Czy często Pan (Pani) flirtuje?", disorder: "histrionic" },
  { id: 68, text: "Czy często podrywa Pan (Pani) inne osoby?", disorder: "histrionic" },
  { id: 69, text: "Czy stara się Pan (Pani) przyciągnąć uwagę poprzez strój lub wygląd?", disorder: "histrionic" },
  { id: 70, text: "Czy ważne jest dla Pana (Pani) bycie wyrazistym i kolorowym (wyrazistą i kolorową)?", disorder: "histrionic" },
  { id: 71, text: "Czy często zmienia Pan (Pani) zdanie w zależności od tego, co mówią osoby, z którymi Pan (Pani) przebywa, lub pod wpływem telewizji?", disorder: "histrionic" },
  { id: 72, text: "Czy ma Pan (Pani) wielu bliskich przyjaciół?", disorder: "histrionic" },

  // NARCISSISTIC 73-89
  { id: 73, text: "Czy ludzie często nie doceniają Pana (Pani) osiągnięć i talentów?", disorder: "narcissistic" },
  { id: 74, text: "Czy ktoś Panu (Pani) mówił, że ma Pan (Pani) zbyt wysokie mniemanie o sobie?", disorder: "narcissistic" },
  { id: 75, text: "Czy dużo myśli Pan (Pani) o władzy, sławie lub uznaniu, jakie kiedyś Pan (Pani) osiągnie?", disorder: "narcissistic" },
  { id: 76, text: "Czy rozmyśla Pan (Pani) o idealnej miłości, która Panu (Pani) się przytrafi?", disorder: "narcissistic" },
  { id: 77, text: "Czy kiedy ma Pan (Pani) jakąś sprawę, zawsze domaga się Pan (Pani) spotkania z osobą na najwyższym szczeblu w organizacji?", disorder: "narcissistic" },
  { id: 78, text: "Czy uważa Pan (Pani), że należy spędzać czas z osobami, które są wpływowe lub wyjątkowe?", disorder: "narcissistic" },
  { id: 79, text: "Czy jest dla Pana (Pani) ważne, aby ludzie zwracali na Pana (Panią) uwagę i podziwiali go (ją)?", disorder: "narcissistic" },
  { id: 80, text: "Czy uważa Pan (Pani), że nie musi trzymać się pewnych zasad lub reguł społecznych, jeśli Panu (Pani) przeszkadzają?", disorder: "narcissistic" },
  { id: 81, text: "Czy czuje Pan (Pani), że jest osobą, która powinna być traktowana w specjalny sposób?", disorder: "narcissistic" },
  { id: 82, text: "Czy często wykorzystuje Pan (Pani) innych, aby osiągnąć własny cel?", disorder: "narcissistic" },
  { id: 83, text: "Czy często przedkłada Pan (Pani) własne potrzeby nad potrzeby innych?", disorder: "narcissistic" },
  { id: 84, text: "Czy często oczekuje Pan (Pani) od ludzi, że będą robić to, czego Pan (Pani) sobie życzy, ze względu na to, kim Pan (Pani) jest?", disorder: "narcissistic" },
  { id: 85, text: "Czy NIE jest Pan (Pani) faktycznie zainteresowany (zainteresowana) uczuciami i problemami innych osób?", disorder: "narcissistic" },
  { id: 86, text: "Czy ludzie skarżyli się, że ich Pan (Pani) nie słucha lub nie dba o ich uczucia?", disorder: "narcissistic" },
  { id: 87, text: "Czy często zazdrości Pan (Pani) innym?", disorder: "narcissistic" },
  { id: 88, text: "Czy czuje Pan (Pani), że inni są w stosunku do Pana (Pani) zawistni?", disorder: "narcissistic" },
  { id: 89, text: "Czy uważa Pan (Pani), że niewiele osób jest wartych Pana (Pani) uwagi i czasu?", disorder: "narcissistic" },

  // BORDERLINE 90-104
  { id: 90, text: "Czy często ogarnia Pana (Panią) rozpacz na myśl, że ktoś bliski może Pana (Panią) opuścić?", disorder: "borderline" },
  { id: 91, text: "Czy w Pana (Pani) relacjach z bliskimi ludźmi są gwałtowne wzloty i upadki?", disorder: "borderline" },
  { id: 92, text: "Czy kiedykolwiek zmieniła się Pana (Pani) opinia o sobie i kierunek, w jakim Pan (Pani) zmierza?", disorder: "borderline" },
  { id: 93, text: "Czy Pana (Pani) poczucie tego, kim Pan (Pani) jest, często się dramatycznie zmienia?", disorder: "borderline" },
  { id: 94, text: "Czy zachowuje się Pan (Pani) inaczej w stosunku do różnych osób i w różnych sytuacjach i czasami nie wie Pan (Pani), jaki (jaka) naprawdę jest?", disorder: "borderline" },
  { id: 95, text: "Czy zaszło wiele gwałtownych zmian w kwestiach Pana (Pani) celów życiowych, planów kariery, przekonań religijnych, itd.?", disorder: "borderline" },
  { id: 96, text: "Czy często zachowuje się Pan (Pani) impulsywnie?", disorder: "borderline" },
  { id: 97, text: "Czy próbował się Pan (próbowała się Pani) skrzywdzić w jakiś sposób lub popełnić samobójstwo albo groził Pan (groziła Pani), że to zrobi?", disorder: "borderline" },
  { id: 98, text: "Czy kiedykolwiek przypalał się Pan (przypalała się Pani), ciął (cięła) lub celowo robił (robiła) sobie krzywdę?", disorder: "borderline" },
  { id: 99, text: "Czy miewa Pan (Pani) nagłe zmiany nastroju?", disorder: "borderline" },
  { id: 100, text: "Czy często czuje się Pan (Pani) pusty (pusta) w środku?", disorder: "borderline" },
  { id: 101, text: "Czy często miewa Pan (Pani) wybuchy emocji lub napady złości, nad którymi trudno jest Panu (Pani) zapanować?", disorder: "borderline" },
  { id: 102, text: "Czy bije Pan (Pani) ludzi lub rzuca w nich przedmiotami?", disorder: "borderline" },
  { id: 103, text: "Czy nawet drobiazgi wywołują Pana (Pani) gniew?", disorder: "borderline" },
  { id: 104, text: "Czy kiedy jest Pan (Pani) w dużym stresie, staje się Pan (Pani) podejrzliwy (podejrzliwa) w stosunku do innych osób i traci kontakt z rzeczywistością?", disorder: "borderline" },

  // ANTISOCIAL 105-119
  { id: 105, text: "Czy zanim ukończył Pan (ukończyła Pani) 15 lat, prześladował (prześladowała Pani) inne dzieci lub groził (groziła) im?", disorder: "antisocial" },
  { id: 106, text: "Czy zanim ukończył Pan (ukończyła Pani) 15 lat, wszczynał Pan (wszczynała Pani) bójki?", disorder: "antisocial" },
  { id: 107, text: "Czy zanim ukończył Pan (ukończyła Pani) 15 lat, kiedykolwiek użył Pan (użyła Pani) broni, która mogła wyrządzić poważną krzywdę innej osobie (np. kija, broni palnej, potłuczonej butelki, noża, cegły)?", disorder: "antisocial" },
  { id: 108, text: "Czy zanim ukończył Pan (ukończyła Pani) 15 lat, kiedykolwiek celowo torturował (torturowała Pani) kogoś lub sprawił Pan (sprawiła Pani) komuś fizyczny ból lub cierpienie?", disorder: "antisocial" },
  { id: 109, text: "Czy zanim ukończył Pan (ukończyła Pani) 15 lat, kiedykolwiek celowo krzywdził Pan (krzywdziła Pani) lub torturował (torturowała) zwierzęta?", disorder: "antisocial" },
  { id: 110, text: "Czy zanim ukończył Pan (ukończyła Pani) 15 lat, kiedykolwiek okradł Pan (okradła Pani) kogoś, napadł (napadła) na kogoś lub coś komuś zabrał (zabrała) przy użyciu przemocy i gróźb?", disorder: "antisocial" },
  { id: 111, text: "Czy zanim ukończył Pan (ukończyła Pani) 15 lat, kiedykolwiek zmusił Pan (zmusiła Pani) kogoś do uprawiania seksu lub do rozebrania się albo do dotykania Pana (Pani) części intymnych?", disorder: "antisocial" },
  { id: 112, text: "Czy zanim ukończył Pan (ukończyła Pani) 15 lat, kiedykolwiek wzniecił Pan (wzniecił Pani) pożar?", disorder: "antisocial" },
  { id: 113, text: "Czy zanim ukończył Pan (ukończyła Pani) 15 lat, zdarzało się, że celowo niszczył Pan (niszczyła Pani) cudze rzeczy?", disorder: "antisocial" },
  { id: 114, text: "Czy zanim ukończył Pan (ukończyła Pani) 15 lat, kiedykolwiek włamał się Pan (włamała się Pani) do domu, innego budynku lub samochodu?", disorder: "antisocial" },
  { id: 115, text: "Czy zanim ukończył Pan (ukończyła Pani) 15 lat, okłamywał Pan (okłamywała Pani) lub 'naciągał' ('naciągała') innych ludzi?", disorder: "antisocial" },
  { id: 116, text: "Czy zanim ukończył Pan (ukończyła Pani) 15 lat, kiedykolwiek ukradł Pan (ukradła Pani) coś, np. w sklepie lub podrobił (podrobiła) czyjś podpis?", disorder: "antisocial" },
  { id: 117, text: "Czy zanim ukończył Pan (ukończyła Pani) 15 lat, kiedykolwiek uciekł Pan (uciekła Pani) z domu lub spędził (spędziła) noc poza domem?", disorder: "antisocial" },
  { id: 118, text: "Czy zanim ukończył Pan (ukończyła Pani) 13 lat, często zostawał Pan (zostawała Pani) do późna poza domem, wracał (wracała) do domu znacznie później niż miał (miała) wrócić?", disorder: "antisocial" },
  { id: 119, text: "Czy zanim ukończył Pan (ukończyła Pani) 13 lat, często opuszczał Pan (opuszczała Pani) zajęcia w szkole?", disorder: "antisocial" },
];

// Populate disorder question arrays
QUESTIONS.forEach(q => {
  if (DISORDERS[q.disorder]) {
    DISORDERS[q.disorder].questions.push(q.id);
  }
});

const SECTIONS = [
  { key: "avoidant", start: 0, end: 7, label: "I" },
  { key: "dependent", start: 7, end: 14, label: "II" },
  { key: "ocpd", start: 14, end: 23, label: "III" },
  { key: "passiveAggressive", start: 23, end: 28, label: "IV" },
  { key: "depressive", start: 28, end: 35, label: "V" },
  { key: "paranoid", start: 35, end: 48, label: "VI" },
  { key: "schizotypal", start: 48, end: 57, label: "VII" },
  { key: "schizoid", start: 57, end: 63, label: "VIII" },
  { key: "histrionic", start: 63, end: 72, label: "IX" },
  { key: "narcissistic", start: 72, end: 89, label: "X" },
  { key: "borderline", start: 89, end: 104, label: "XI" },
  { key: "antisocial", start: 104, end: 119, label: "XII" },
];

export default function SCIDII() {
  const [answers, setAnswers] = useState({});
  const [currentSection, setCurrentSection] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [started, setStarted] = useState(false);
  const topRef = useRef(null);

  const section = SECTIONS[currentSection];
  const sectionQuestions = QUESTIONS.slice(section.start, section.end);
  const disorder = DISORDERS[section.key];
  const totalAnswered = Object.keys(answers).length;
  const progress = (totalAnswered / 119) * 100;

  const sectionComplete = sectionQuestions.every(q => answers[q.id] !== undefined);

  useEffect(() => {
    if (topRef.current) topRef.current.scrollIntoView({ behavior: "smooth" });
  }, [currentSection, showResults]);

  const handleAnswer = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const calculateResults = () => {
    const results = {};
    Object.entries(DISORDERS).forEach(([key, d]) => {
      const yesCount = d.questions.filter(qId => answers[qId] === true).length;
      const total = d.questions.length;
      const meetsThreshold = yesCount >= d.threshold;
      results[key] = { yesCount, total, threshold: d.threshold, meetsThreshold, percentage: Math.round((yesCount / total) * 100) };
    });
    return results;
  };

  if (!started) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0b", color: "#e4e4e7", fontFamily: "'Courier New', monospace", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: 640, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: "#71717a", marginBottom: 24, textTransform: "uppercase" }}>Kwestionariusz przesiewowy</div>
          <h1 style={{ fontSize: 42, fontWeight: 700, margin: "0 0 8px", letterSpacing: -1, color: "#fafafa" }}>SCID-II</h1>
          <div style={{ fontSize: 14, color: "#a1a1aa", marginBottom: 40 }}>Structured Clinical Interview for DSM-5 Personality Disorders</div>
          
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 24, textAlign: "left", marginBottom: 32, fontSize: 13, lineHeight: 1.7, color: "#a1a1aa" }}>
            <p style={{ margin: "0 0 12px", color: "#dc2626", fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>⚠ Zastrzeżenie</p>
            <p style={{ margin: "0 0 8px" }}>Ten kwestionariusz jest narzędziem <strong style={{ color: "#e4e4e7" }}>przesiewowym</strong>, nie diagnostycznym. Wynik pozytywny oznacza, że wskazana jest dalsza diagnostyka kliniczna — nie oznacza diagnozy.</p>
            <p style={{ margin: 0 }}>119 pytań · ~15 minut · wyniki natychmiast</p>
          </div>

          <button onClick={() => setStarted(true)} style={{ background: "#fafafa", color: "#0a0a0b", border: "none", padding: "14px 48px", fontSize: 14, fontWeight: 600, borderRadius: 6, cursor: "pointer", letterSpacing: 1, fontFamily: "inherit", transition: "opacity 0.2s" }} onMouseOver={e => e.target.style.opacity = 0.85} onMouseOut={e => e.target.style.opacity = 1}>
            ROZPOCZNIJ
          </button>
        </div>
      </div>
    );
  }

  if (showResults) {
    const results = calculateResults();
    const flagged = Object.entries(results).filter(([, r]) => r.meetsThreshold).sort((a, b) => b[1].percentage - a[1].percentage);
    const notFlagged = Object.entries(results).filter(([, r]) => !r.meetsThreshold).sort((a, b) => b[1].percentage - a[1].percentage);

    return (
      <div ref={topRef} style={{ minHeight: "100vh", background: "#0a0a0b", color: "#e4e4e7", fontFamily: "'Courier New', monospace", padding: "32px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: "#71717a", marginBottom: 8, textTransform: "uppercase" }}>Wyniki SCID-II</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 32px", color: "#fafafa" }}>Profil osobowości</h1>

          {flagged.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, letterSpacing: 4, color: "#dc2626", marginBottom: 16, textTransform: "uppercase", fontWeight: 600 }}>⚠ Przekroczony próg — wskazana diagnostyka</div>
              {flagged.map(([key, r]) => {
                const d = DISORDERS[key];
                return (
                  <div key={key} style={{ background: "#18181b", border: "1px solid #dc262640", borderRadius: 8, padding: 20, marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <span style={{ fontSize: 16, fontWeight: 700, color: d.color }}>{d.name}</span>
                        <span style={{ fontSize: 12, color: "#71717a", marginLeft: 8 }}>{d.nameEn}</span>
                      </div>
                      <span style={{ fontSize: 24, fontWeight: 700, color: "#dc2626" }}>{r.yesCount}/{r.total}</span>
                    </div>
                    <div style={{ background: "#27272a", borderRadius: 4, height: 6, overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ width: `${r.percentage}%`, height: "100%", background: d.color, borderRadius: 4, transition: "width 0.5s ease" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#71717a" }}>Próg: {r.threshold} · Wynik: {r.yesCount} · {r.percentage}%</div>
                  </div>
                );
              })}
            </div>
          )}

          {flagged.length === 0 && (
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 24, marginBottom: 40, textAlign: "center" }}>
              <div style={{ fontSize: 18, color: "#22c55e", marginBottom: 8 }}>Brak przekroczonych progów</div>
              <div style={{ fontSize: 13, color: "#71717a" }}>Żadne zaburzenie osobowości nie przekroczyło progu przesiewowego.</div>
            </div>
          )}

          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#71717a", marginBottom: 16, textTransform: "uppercase" }}>Poniżej progu</div>
            {notFlagged.map(([key, r]) => {
              const d = DISORDERS[key];
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 0", borderBottom: "1px solid #1a1a1e" }}>
                  <div style={{ width: 180, fontSize: 13, color: "#a1a1aa" }}>{d.name}</div>
                  <div style={{ flex: 1, background: "#27272a", borderRadius: 4, height: 4, overflow: "hidden" }}>
                    <div style={{ width: `${r.percentage}%`, height: "100%", background: "#3f3f46", borderRadius: 4 }} />
                  </div>
                  <div style={{ width: 60, textAlign: "right", fontSize: 13, color: "#52525b" }}>{r.yesCount}/{r.total}</div>
                </div>
              );
            })}
          </div>

          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 20, fontSize: 12, lineHeight: 1.7, color: "#71717a", marginBottom: 32 }}>
            <strong style={{ color: "#a1a1aa" }}>Uwaga:</strong> Kwestionariusz SCID-II jest narzędziem przesiewowym. Przekroczenie progu NIE oznacza diagnozy zaburzenia osobowości. Oznacza, że wskazana jest pogłębiona diagnostyka kliniczna (wywiad SCID-II) prowadzona przez specjalistę. Wyniki poniżej progu nie wykluczają zaburzenia.
          </div>

          <button onClick={() => { setShowResults(false); setAnswers({}); setCurrentSection(0); setStarted(false); }} style={{ background: "#27272a", color: "#a1a1aa", border: "1px solid #3f3f46", padding: "12px 32px", fontSize: 13, borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>
            Wypełnij ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={topRef} style={{ minHeight: "100vh", background: "#0a0a0b", color: "#e4e4e7", fontFamily: "'Courier New', monospace", padding: "24px 24px 120px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Progress */}
        <div style={{ position: "sticky", top: 0, background: "#0a0a0b", paddingBottom: 16, zIndex: 10, paddingTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, letterSpacing: 4, color: "#71717a", textTransform: "uppercase" }}>
              Sekcja {section.label} / XII
            </span>
            <span style={{ fontSize: 11, color: "#52525b" }}>{totalAnswered}/119</span>
          </div>
          <div style={{ background: "#27272a", borderRadius: 2, height: 3, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "#fafafa", borderRadius: 2, transition: "width 0.3s ease" }} />
          </div>
        </div>

        {/* Section header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, color: disorder.color, fontWeight: 600, marginBottom: 4 }}>{disorder.name}</div>
          <div style={{ fontSize: 11, color: "#52525b" }}>{sectionQuestions.length} pytań · próg: {disorder.threshold}</div>
        </div>

        {/* Questions */}
        {sectionQuestions.map((q, i) => (
          <div key={q.id} style={{ marginBottom: 20, padding: 16, background: answers[q.id] !== undefined ? "#111113" : "#18181b", border: `1px solid ${answers[q.id] !== undefined ? "#27272a" : "#27272a"}`, borderRadius: 8, transition: "all 0.2s" }}>
            <div style={{ fontSize: 12, color: "#52525b", marginBottom: 8 }}>{q.id}.</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "#d4d4d8", marginBottom: 16 }}>{q.text}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => handleAnswer(q.id, false)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  border: `1px solid ${answers[q.id] === false ? "#fafafa" : "#3f3f46"}`,
                  background: answers[q.id] === false ? "#fafafa" : "transparent",
                  color: answers[q.id] === false ? "#0a0a0b" : "#71717a",
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  letterSpacing: 2,
                }}
              >
                NIE
              </button>
              <button
                onClick={() => handleAnswer(q.id, true)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  border: `1px solid ${answers[q.id] === true ? disorder.color : "#3f3f46"}`,
                  background: answers[q.id] === true ? disorder.color : "transparent",
                  color: answers[q.id] === true ? "#fafafa" : "#71717a",
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  letterSpacing: 2,
                }}
              >
                TAK
              </button>
            </div>
          </div>
        ))}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          {currentSection > 0 && (
            <button onClick={() => setCurrentSection(prev => prev - 1)} style={{ flex: 1, padding: "14px", fontSize: 13, fontFamily: "inherit", background: "transparent", border: "1px solid #27272a", color: "#71717a", borderRadius: 6, cursor: "pointer", letterSpacing: 1 }}>
              ← WSTECZ
            </button>
          )}
          {currentSection < SECTIONS.length - 1 ? (
            <button
              onClick={() => sectionComplete && setCurrentSection(prev => prev + 1)}
              disabled={!sectionComplete}
              style={{
                flex: 2,
                padding: "14px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
                background: sectionComplete ? "#fafafa" : "#27272a",
                border: "none",
                color: sectionComplete ? "#0a0a0b" : "#52525b",
                borderRadius: 6,
                cursor: sectionComplete ? "pointer" : "not-allowed",
                letterSpacing: 1,
                transition: "all 0.2s",
              }}
            >
              DALEJ →
            </button>
          ) : (
            <button
              onClick={() => sectionComplete && setShowResults(true)}
              disabled={!sectionComplete}
              style={{
                flex: 2,
                padding: "14px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
                background: sectionComplete ? "#dc2626" : "#27272a",
                border: "none",
                color: sectionComplete ? "#fafafa" : "#52525b",
                borderRadius: 6,
                cursor: sectionComplete ? "pointer" : "not-allowed",
                letterSpacing: 1,
                transition: "all 0.2s",
              }}
            >
              WYNIKI
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

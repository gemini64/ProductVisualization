## Definizione del tema, project goals ecc...
Il progetto è cominciato con una fase di ricerca e concettualizzazione come suggerito dalla indicazioni di progetto.

In questa fase sono stati scelti il tema e lo stile generale del sito mockup ed è stato scelto il tipo di oggetto 3d da utilizzare nel configuratore

Alcune delle fonti di ispirazione per la fase preliminare sono state:
- i siti web dei produttori di skateboard più famosi ( Santa Cruz, Girl Skateboards, Elements, Polar ecc...)
- il subreddit [r/3dconfigurators](https://www.reddit.com/r/3dconfigurators/)

## Creazione degli shader
Con l'obiettivo di creare una coppia di shader che prendessero come input un set di texture pbr-ready, ho creato una scena 3d "minima", contenente un modello 3d di prova, un environment map e alcune sorgenti di illuminazione puntiformi.

In ordine:
- ho effettuato un installazione self-hosted della libreria **threejs**
- ho selezionato su **sketchfab** un modello di prova
- ho creato velocemente un set di texture di prova con **Substance Painter** con una normal map ed una occlusion map compatibile con WebGl ( Substance utilizza di default un encoding delle normal map di tipo DirectX e come spazio di coordinate [MikkTanget Space](http://www.mikktspace.com/) )

Lo shader finale calcola la radianza finale come somma dei contributi di:
- Luce diretta di tipo puntiforme, con una BRDF di tipo lambert diffuse + microfacets, con attenuazione basata sulla distanza
- Luce indiretta da un environment map. Vengono utilizzate due cubemap pre-filtrate e la soluzione di BRDF ambientale vista a lezione

Le parti più complesse di questa fase sono state:
- Gestire gli errori nel caricamento delle texture con i loader predefiniti di threejs (in particolare per la lettura corretta delle coordinate UV)
- Selezionare una modalità per il calcolo delle mappe pre-filtrate di radianza/irradianza ambientale

Ed in particolare, per quanto riguarda l'ultimo punto, ho effettuato vari tentativi cercando dapprima di utilizzare l'utility threejs **PMREMGenerator** senza ottenere risultati accettabili.

In seguito ho provato ad utilizzare la sola environment map ed il livello più basso di texture LOD per simulare una irradiance map, ottenendo dei risultati poco gradevoli.

Infine ho provato una serie di tool e formati per il calcolo ed encoding offline delle due cubemap con tutti i livelli di mip pre-calcolati (e questa è la soluzione che ho scelto alla fine).

## Setup del modello e creazione delle texture
Con poco tempo a disposizione ho deciso di selezionare un modello 3d già pronto ed effettuare soltanto le operazioni di texturing.

Provando a descrivere brevemente il workflow completo:
- reperimento di un modello 3d di skateboard su sketchfab con un tipo di licenza adeguata al progetto.
- apertura del modello sorgente in blender, setup di gruppi di mesh separati per le diverse componenti del modello (questo per poter gestire separatamente le texture per ruote, board, trucks e bulloneria dello skateboard)
- setup di un materialID ( tramite vertex color ) per semplificare le operazioni di texturing
- revisione e re-UV di alcune parti del modello
- setup del progetto su substance painter utilizzando parametri adeguati ad una configurazione OpenGL
- texturing
- creazione di stickers, loghi e decals e alpha masks per il modello in Affinity Designer & Affinity Photo
- applicazione degli stickers al modello in substance
- export delle texture map in risoluzione 2k e 4k

## Creazione delle thumbnails
Per creare le thumbnails per l'interfaccia di selezione dei materiali ho deciso di effettuare molto velocemente dei render utilizzando il renderer di blender

la procedura spiegata molto brevemente:
- selezione di una HDRI Map adeguata
- applicazione delle texture realizzate su painter sul modello 3d (qui ho utilizzato le texture 4k)
- setup dell'inquadratura, esposizione, intesità luminosa, post-rendering denoising ecc...
- render con **Cycles**
- editing dei render finali in batch su Affinity Photo

## Setup della scena finale
A questo punto, ho caricato il modello e le texture definitive nella mia scena threejs ed ho impostato le luci della scena.

La scena finale utilizza 3 point lights (1 key e 2 fill laterali) ed un contributo minimo della envMap.

## Setup dell'interfaccia per la selezione dei materiali
Qui purtroppo ho speso gran parte del tempo dedicato a questo progetto, a causa di alcune scelte infelici effettuate nelle fasi precedenti.

Probabilmente la selezione di un qualunque framework javascript per la realizzazione di interfacce mi avrebbe semplificato molto questa procedura.

L'interfaccia è stata pensata su carta e successivamente realizzata in maniera dinamica utilizzando dei template di frammenti html.

Il risultato finale è una ui per la selezione dei materiali "flottante" che dovrebbe essere utilizzabile anche su mobile.
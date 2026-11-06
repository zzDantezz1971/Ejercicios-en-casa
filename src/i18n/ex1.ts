/* Traducciones de los ejercicios (1/4).
   Orden: [nombre, zona, posición inicial, movimiento, consejo, errores, versión fácil]. */
export type ExT = [string, string, string, string, string, string, string];

export const EX1: Record<string, { ca: ExT; en: ExT }> = {
  'marcha-en-el-sitio': {
    ca: ['Marxa al lloc', 'Cos sencer', 'Dempeus, peus a l’amplada dels malucs i braços relaxats.', 'Puja un genoll fins a l’altura del maluc i baixa’l; després l’altre. Acompanya-ho amb el braç contrari, com quan camines.', 'Mantén el tronc dret i recolza el peu amb suavitat.', 'Tirar el tronc enrere en pujar el genoll.', 'Puja els genolls només fins a mitja alçada.'],
    en: ['Marching on the spot', 'Full body', 'Stand with your feet hip-width apart and arms relaxed.', 'Lift one knee to hip height and lower it, then the other. Swing the opposite arm, as when walking.', 'Keep your torso upright and land softly.', 'Leaning back as you lift the knee.', 'Lift your knees only halfway.'],
  },
  'saltos-de-tijera-jumping-jacks': {
    ca: ['Salts de tisora (jumping jacks)', 'Cos sencer', 'Dempeus, peus junts i braços als costats.', 'Salta obrint les cames i pujant els braços per sobre del cap. Torna a tancar amb un altre salt.', 'Cau sobre la part davantera del peu, amb els genolls una mica flexionats.', 'Caure amb les cames rígides o sobre els talons.', 'Sense saltar: obre una cama cada vegada cap al costat mentre puges els braços.'],
    en: ['Jumping jacks', 'Full body', 'Stand with your feet together and arms by your sides.', 'Jump your legs apart while raising your arms overhead. Jump back to the start.', 'Land on the balls of your feet with your knees slightly bent.', 'Landing stiff-legged or on your heels.', 'No jumping: step one leg out to the side at a time as you raise your arms.'],
  },
  'circulos-de-brazos': {
    ca: ['Cercles de braços', 'Espatlles', 'Dempeus, braços estirats en creu a l’altura de les espatlles.', 'Dibuixa cercles petits amb les mans cap endavant. A la meitat del temps canvia el sentit i fes-los cap enrere.', 'Respira amb normalitat i mantén les espatlles lluny de les orelles.', 'Deixar caure els braços per sota de les espatlles.', 'Cercles més petits o amb un braç cada vegada.'],
    en: ['Arm circles', 'Shoulders', 'Stand with your arms stretched out to the sides at shoulder height.', 'Draw small forward circles with your hands. Halfway through, switch direction and circle backwards.', 'Breathe normally and keep your shoulders away from your ears.', 'Letting your arms drop below shoulder height.', 'Smaller circles, or one arm at a time.'],
  },
  'abrir-y-cerrar-brazos-abrazos': {
    ca: ['Obrir i tancar braços (abraçades)', 'Pit i espatlles', 'Dempeus, braços oberts en creu.', 'Tanca els braços per davant del pit com si et fessis una abraçada, creuant-los. Torna a obrir-los amb energia.', 'En obrir, treu pit i ajunta una mica els omòplats.', 'Fer-ho tan de pressa que el moviment sigui una estrebada.', 'Recorregut més curt i ritme lent.'],
    en: ['Arm swings (self hugs)', 'Chest and shoulders', 'Stand with your arms open wide.', 'Cross your arms in front of your chest as if hugging yourself. Open them again with energy.', 'As you open, lift your chest and gently squeeze your shoulder blades.', 'Going so fast the movement becomes a jerk.', 'Shorter range and a slow pace.'],
  },
  'giros-de-tronco': {
    ca: ['Girs de tronc', 'Columna', 'Dempeus, cames una mica separades i genolls relaxats. Braços relaxats.', 'Gira el tronc cap a un costat i cap a l’altre deixant que els braços segueixin el moviment.', 'El maluc mira endavant: el gir surt de la cintura i de la part alta de l’esquena.', 'Girar bruscament o forçar el final del gir.', 'Mans a la cintura i girs curts.'],
    en: ['Torso twists', 'Spine', 'Stand with your feet slightly apart, knees soft and arms relaxed.', 'Rotate your torso from side to side, letting your arms follow the movement.', 'Your hips face forward: the twist comes from the waist and upper back.', 'Twisting abruptly or forcing the end of the turn.', 'Hands on hips and short twists.'],
  },
  'circulos-de-cadera': {
    ca: ['Cercles de maluc', 'Maluc i zona lumbar', 'Dempeus, peus a l’amplada de les espatlles i mans a la cintura.', 'Dibuixa cercles amplis amb el maluc. A la meitat del temps canvia de sentit.', 'Moviment lent i continu; un bon exercici per afluixar la zona lumbar.', 'Moure les espatlles en lloc del maluc.', 'Cercles més petits.'],
    en: ['Hip circles', 'Hips and lower back', 'Stand with your feet shoulder-width apart and hands on your hips.', 'Draw wide circles with your hips. Halfway through, switch direction.', 'Slow, continuous movement; a great way to loosen the lower back.', 'Moving your shoulders instead of your hips.', 'Smaller circles.'],
  },
  'inclinaciones-laterales-de-tronco': {
    ca: ['Inclinacions laterals de tronc', 'Costats', 'Dempeus, peus a l’amplada de les espatlles.', 'Puja un braç per sobre del cap i deixa caure el tronc cap al costat contrari. Torna i repeteix cap a l’altre costat.', 'Inclina’t de costat, sense tirar el cos endavant ni enrere.', 'Fer rebots al final de la inclinació.', 'Mans a la cintura i menys recorregut.'],
    en: ['Standing side bends', 'Sides', 'Stand with your feet shoulder-width apart.', 'Raise one arm overhead and lean your torso to the opposite side. Come back up and repeat on the other side.', 'Bend sideways, without leaning forwards or backwards.', 'Bouncing at the end of the bend.', 'Hands on hips and a smaller range.'],
  },
  'talones-al-gluteo': {
    ca: ['Talons al gluti', 'Cames', 'Dempeus, tronc recte.', 'Porta un taló cap al gluti i baixa’l; després l’altre, a ritme de trot suau.', 'Els genolls apunten a terra i els braços acompanyen.', 'Inclinar el tronc endavant.', 'Fes-ho caminant al lloc, sense saltirons.'],
    en: ['Butt kicks', 'Legs', 'Stand tall with your torso straight.', 'Kick one heel up towards your glutes and lower it, then the other, at a gentle jogging pace.', 'Knees point down and your arms swing along.', 'Leaning your torso forward.', 'Do it walking on the spot, without hopping.'],
  },
  'sentadillas-sin-peso': {
    ca: ['Esquats sense pes', 'Cames i glutis', 'Dempeus, peus a l’amplada de les espatlles amb les puntes una mica obertes.', 'Baixa com si t’asseguessis en una cadira, portant el maluc enrere i els braços endavant. Puja empenyent el terra.', 'Deixa anar l’aire en pujar. Esquena recta i pes als talons.', 'Que els genolls se’n vagin cap a dins o que els talons es desenganxin.', 'Baixa només fins a mitja alçada o fins a tocar una cadira.'],
    en: ['Bodyweight squats', 'Legs and glutes', 'Stand with your feet shoulder-width apart, toes turned slightly out.', 'Lower as if sitting into a chair, pushing your hips back and arms forward. Stand up by pushing through the floor.', 'Breathe out as you rise. Back straight and weight on your heels.', 'Knees caving in or heels lifting off the floor.', 'Go only halfway down, or down to touch a chair.'],
  },
  'zancadas-alternas': {
    ca: ['Gambades alternes', 'Cames i glutis', 'Dempeus, mans a la cintura.', 'Fes un pas llarg endavant i baixa fins que el genoll de darrere quedi a prop del terra. Torna i canvia de cama.', 'Tronc recte; el genoll de davant no passa gaire de la punta del peu.', 'Pas massa curt o deixar caure el tronc endavant.', 'Menys profunditat i amb una mà recolzada a la paret.'],
    en: ['Alternating lunges', 'Legs and glutes', 'Stand with your hands on your hips.', 'Take a long step forward and lower until your back knee is close to the floor. Step back and switch legs.', 'Torso upright; your front knee doesn’t travel far past your toes.', 'Taking too short a step or letting your torso drop forward.', 'Go less deep and keep one hand on a wall.'],
  },
  'balanceo-de-pierna-adelante-y-atras': {
    ca: ['Balanceig de cama endavant i enrere', 'Maluc', 'Dempeus, de costat a una paret o una cadira, recolzat amb una mà.', 'Balanceja la cama lliure endavant i enrere de manera relaxada. A la meitat del temps canvia de cama.', 'Comença suau i augmenta el recorregut a poc a poc.', 'Arquejar la zona lumbar en portar la cama enrere.', 'Balancejos més curts.'],
    en: ['Front-to-back leg swings', 'Hips', 'Stand side-on to a wall or chair, holding on with one hand.', 'Swing your free leg forwards and backwards loosely. Halfway through, switch legs.', 'Start gently and increase the range little by little.', 'Arching your lower back as the leg swings back.', 'Shorter swings.'],
  },
  'punetazos-al-aire': {
    ca: ['Cops de puny a l’aire', 'Braços i espatlles', 'Dempeus, un peu una mica avançat, genolls relaxats i punys a l’altura de la barbeta.', 'Llança cops de puny endavant alternant els braços i torna sempre a la guàrdia.', 'Gira una mica el tronc amb cada cop i no bloquegis el colze en estirar.', 'Estirar el braç de cop fins al final.', 'Ritme més lent.'],
    en: ['Shadow boxing punches', 'Arms and shoulders', 'Stand with one foot slightly forward, knees soft and fists at chin height.', 'Throw punches forward, alternating arms, and always return to your guard.', 'Rotate your torso slightly with each punch and don’t lock your elbow.', 'Snapping the arm straight all the way.', 'Slower pace.'],
  },
  'encogimientos-de-hombros': {
    ca: ['Encongiments d’espatlles', 'Trapezi', 'Dempeus, peus a l’amplada del maluc, una manuella a cada mà amb els braços estirats als costats.', 'Puja les espatlles cap a les orelles tan amunt com puguis, aguanta un segon a dalt i baixa-les a poc a poc.', 'Els braços no es dobleguen: només pugen les espatlles. Esquena dreta i abdominals contrets. Agafa aire en baixar i deixa’l anar en pujar.', 'Fer cercles amb les espatlles o moure el coll endavant.', 'Fes-ho amb menys pes o sense manuelles.'],
    en: ['Shoulder shrugs', 'Traps', 'Stand with your feet hip-width apart, a dumbbell in each hand and arms straight by your sides.', 'Shrug your shoulders up towards your ears as high as you can, hold for a second and lower them slowly.', 'Your arms don’t bend: only your shoulders move. Back straight, core tight. Breathe in as you lower and out as you lift.', 'Rolling your shoulders or pushing your neck forward.', 'Use less weight or no dumbbells.'],
  },
  'press-de-hombros-sentado': {
    ca: ['Press d’espatlles assegut', 'Espatlles', 'Assegut al banc amb el respatller vertical. Manuelles a l’altura de les espatlles, palmells endavant.', 'Empeny les manuelles amunt fins gairebé ajuntar-les. Baixa a poc a poc fins a les espatlles.', 'Deixa anar l’aire en pujar. Esquena recolzada i abdomen ferm.', 'Arquejar l’esquena per empènyer.', 'Un braç cada vegada o menys pes.'],
    en: ['Seated shoulder press', 'Shoulders', 'Sit on the bench with the backrest upright. Dumbbells at shoulder height, palms facing forward.', 'Press the dumbbells up until they almost touch. Lower slowly back to your shoulders.', 'Breathe out as you press. Back supported and core firm.', 'Arching your back to push.', 'One arm at a time, or less weight.'],
  },
  'elevaciones-laterales': {
    ca: ['Elevacions laterals', 'Espatlles', 'Dempeus, una manuella a cada mà al costat de les cuixes i colzes una mica doblegats.', 'Puja els braços cap als costats fins a l’altura de les espatlles. Baixa a poc a poc.', 'Deixa anar l’aire en pujar. Els dits petits no pugen més que els polzes.', 'Balancejar el cos o pujar per sobre de les espatlles.', 'Menys pes i puja fins a mitja alçada.'],
    en: ['Lateral raises', 'Shoulders', 'Stand with a dumbbell in each hand beside your thighs, elbows slightly bent.', 'Raise your arms out to the sides to shoulder height. Lower slowly.', 'Breathe out as you lift. Your little fingers don’t go higher than your thumbs.', 'Swinging your body or lifting above shoulder height.', 'Less weight and lift only halfway.'],
  },
  'elevaciones-frontales': {
    ca: ['Elevacions frontals', 'Espatlles', 'Dempeus, manuelles davant de les cuixes.', 'Puja els braços estirats endavant fins a l’altura de les espatlles. Baixa a poc a poc.', 'Deixa anar l’aire en pujar. Tronc quiet.', 'Tirar el cos enrere per ajudar-te.', 'Alterna els braços.'],
    en: ['Front raises', 'Shoulders', 'Stand with the dumbbells in front of your thighs.', 'Raise your straight arms in front of you to shoulder height. Lower slowly.', 'Breathe out as you lift. Keep your torso still.', 'Leaning back to help the lift.', 'Alternate arms.'],
  },
  'pajaros-elevaciones-posteriores': {
    ca: ['Ocells (elevacions posteriors)', 'Espatlla posterior i part alta de l’esquena', 'Bocaterrosa sobre el banc inclinat, braços penjant amb les manuelles i colzes una mica doblegats.', 'Obre els braços cap als costats fins a l’altura de les espatlles. Baixa a poc a poc.', 'Pes molt lleuger: treballa la part de darrere de l’espatlla i millora la postura.', 'Pujar amb impuls o encongir les espatlles.', 'Sense pes o amb ampolles d’aigua.'],
    en: ['Reverse flyes', 'Rear shoulders and upper back', 'Lie face down on the incline bench, arms hanging with the dumbbells and elbows slightly bent.', 'Open your arms out to the sides to shoulder height. Lower slowly.', 'Very light weight: it works the back of the shoulder and improves posture.', 'Using momentum or shrugging your shoulders.', 'No weight, or water bottles.'],
  },
  'elevacion-en-y-inclinado': {
    ca: ['Elevació en Y inclinat', 'Espatlla posterior i part alta de l’esquena', 'Dempeus, genolls una mica doblegats, inclina’t des del maluc amb l’esquena recta gairebé en angle recte. Manuelles penjant sota les espatlles.', 'Puja els braços estirats endavant i cap enfora, formant una Y amb el cos, fins a l’altura del cap. Baixa a poc a poc.', 'Ajunta els omòplats en pujar i no encongeixis les espatlles. Abdominals contrets. Agafa aire en baixar i deixa’l anar en pujar.', 'Arrodonir l’esquena o pujar amb impuls.', 'Fes-ho sense pes o recolzant el pit al banc inclinat.'],
    en: ['Bent-over Y raise', 'Rear shoulders and upper back', 'Stand with your knees slightly bent and hinge at the hips with a straight back, almost at a right angle. Dumbbells hanging below your shoulders.', 'Raise your straight arms forwards and outwards, making a Y with your body, up to head height. Lower slowly.', 'Squeeze your shoulder blades as you lift and don’t shrug. Core tight. Breathe in as you lower and out as you lift.', 'Rounding your back or using momentum.', 'Do it without weight, or with your chest supported on the incline bench.'],
  },
  'press-de-banca-con-mancuernas': {
    ca: ['Press de banca amb manuelles', 'Pit', 'Estirat de panxa enlaire al banc pla, peus a terra i una manuella a cada mà a l’altura del pit.', 'Empeny les manuelles amunt fins a estirar els braços. Baixa a poc a poc fins a l’altura del pit.', 'Deixa anar l’aire en pujar. Mantén l’esquena recolzada al banc.', 'Arquejar molt la zona lumbar o baixar les manuelles de cop.', 'Menys pes i recorregut més curt.'],
    en: ['Dumbbell bench press', 'Chest', 'Lie on your back on the flat bench, feet on the floor and a dumbbell in each hand at chest level.', 'Press the dumbbells up until your arms are straight. Lower slowly to chest level.', 'Breathe out as you press. Keep your back on the bench.', 'Over-arching your lower back or dropping the dumbbells.', 'Less weight and a shorter range.'],
  },
  'press-inclinado-con-mancuernas': {
    ca: ['Press inclinat amb manuelles', 'Part alta del pit', 'Assegut al banc inclinat (uns 30°), esquena recolzada i manuelles a l’altura de les espatlles.', 'Empeny les manuelles amunt fins a estirar els braços. Baixa a poc a poc.', 'Deixa anar l’aire en pujar. Treballa la part alta del pit.', 'Desenganxar l’esquena del banc.', 'Menys inclinació i menys pes.'],
    en: ['Incline dumbbell press', 'Upper chest', 'Sit on the incline bench (about 30°), back supported and dumbbells at shoulder height.', 'Press the dumbbells up until your arms are straight. Lower slowly.', 'Breathe out as you press. It works the upper chest.', 'Lifting your back off the bench.', 'Less incline and less weight.'],
  },
  'aperturas-con-mancuernas': {
    ca: ['Obertures amb manuelles', 'Pit', 'Estirat al banc pla, braços estirats cap al sostre amb les manuelles juntes i els colzes una mica doblegats.', 'Obre els braços en arc cap als costats fins a notar l’estirament del pit. Tanca’ls pel mateix camí.', 'Els colzes es mantenen sempre una mica doblegats. Agafa aire en obrir.', 'Baixar massa els braços o fer servir molt de pes.', 'Obre menys i amb poc pes.'],
    en: ['Dumbbell flyes', 'Chest', 'Lie on the flat bench, arms extended towards the ceiling with the dumbbells together and elbows slightly bent.', 'Open your arms in an arc out to the sides until you feel a stretch in your chest. Bring them back the same way.', 'Keep your elbows slightly bent throughout. Breathe in as you open.', 'Lowering your arms too far or using too much weight.', 'Open less and use little weight.'],
  },
  'pullover-con-mancuerna': {
    ca: ['Pullover amb manuella', 'Pit i esquena', 'Estirat al banc pla, subjecta una manuella amb les dues mans damunt del pit.', 'Porta la manuella enrere per sobre del cap amb els braços gairebé estirats. Torna al punt de partida.', 'Agafa aire en baixar i deixa’l anar en pujar. Abdomen ferm.', 'Arquejar la zona lumbar en portar el pes enrere.', 'Menys recorregut per darrere del cap.'],
    en: ['Dumbbell pullover', 'Chest and back', 'Lie on the flat bench holding one dumbbell with both hands above your chest.', 'Lower the dumbbell back over your head with your arms almost straight. Return to the start.', 'Breathe in as you lower and out as you lift. Core firm.', 'Arching your lower back as the weight goes back.', 'Less range behind your head.'],
  },
  'remo-a-una-mano-apoyado-en-banco': {
    ca: ['Rem a una mà recolzat al banc', 'Esquena', 'Un genoll i la mà del mateix costat sobre el banc; l’altra cama a terra. Esquena recta i manuella penjant.', 'Estira la manuella cap al maluc portant el colze enrere i enganxat al cos. Baixa a poc a poc. A la meitat del temps canvia de costat.', 'Deixa anar l’aire en pujar. En estar recolzat, la zona lumbar no pateix.', 'Girar el tronc per pujar el pes.', 'Menys pes.'],
    en: ['One-arm bench-supported row', 'Back', 'One knee and the same-side hand on the bench, the other foot on the floor. Back straight and dumbbell hanging.', 'Pull the dumbbell towards your hip, driving your elbow back close to your body. Lower slowly. Halfway through, switch sides.', 'Breathe out as you pull. With your body supported, your lower back is protected.', 'Twisting your torso to lift the weight.', 'Less weight.'],
  },
  'remo-con-pecho-apoyado-en-banco-inclinado': {
    ca: ['Rem amb el pit recolzat al banc inclinat', 'Esquena', 'Bocaterrosa sobre el banc inclinat, pit recolzat i una manuella a cada mà penjant.', 'Estira les manuelles portant els colzes enrere i ajunta els omòplats. Baixa a poc a poc.', 'Deixa anar l’aire en pujar. El banc protegeix la zona lumbar.', 'Desenganxar el pit del banc.', 'Menys pes.'],
    en: ['Chest-supported incline row', 'Back', 'Lie face down on the incline bench, chest supported, with a dumbbell hanging in each hand.', 'Pull the dumbbells up, driving your elbows back and squeezing your shoulder blades. Lower slowly.', 'Breathe out as you pull. The bench protects your lower back.', 'Lifting your chest off the bench.', 'Less weight.'],
  },
};

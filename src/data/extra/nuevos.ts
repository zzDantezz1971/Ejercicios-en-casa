import { x, type ExtraEx } from './types';

/*
 * Ejercicios nuevos (noviembre de 2026). Al principio van todos juntos en el grupo «Nuevos», al inicio de su
 * apartado, para revisarlos; luego se pasarán a su grupo de siempre.
 */
export const NEW_GROUP = 'Nuevos';

export const NUEVOS: ExtraEx[] = [
  // ── Calentamiento ──
  x('calentamiento', NEW_GROUP, 'Rodilla al pecho caminando', 'Glúteos y cadera', '', '+gluteos ~isquios ~cuadriceps', false,
    ['De pie, brazos a los lados.', 'Sube una rodilla y abrázala contra el pecho con las dos manos un momento; bájala y hazlo con la otra, como si caminaras.', 'Mantén la espalda recta y la pierna de apoyo estirada.', 'Encorvar la espalda para llegar a la rodilla.', 'Sube la rodilla menos y sujétala con una sola mano.'],
    ['Genoll al pit caminant', 'Glutis i maluc', 'Dempeus, braços als costats.', 'Puja un genoll i abraça’l contra el pit amb les dues mans un moment; baixa’l i fes-ho amb l’altre, com si caminessis.', 'Mantén l’esquena recta i la cama de suport estirada.', 'Encorbar l’esquena per arribar al genoll.', 'Puja menys el genoll i subjecta’l amb una sola mà.'],
    ['Walking knee hugs', 'Glutes and hips', 'Stand with your arms by your sides.', 'Lift one knee and hug it to your chest with both hands for a moment; lower it and do the other, as if walking.', 'Keep your back straight and your standing leg straight.', 'Rounding your back to reach the knee.', 'Lift the knee less and hold it with one hand.'], ['gentle']),
  x('calentamiento', NEW_GROUP, 'Bisagra de cadera sin peso', 'Isquiotibiales y zona lumbar', '', '+isquios +gluteos ~lumbar', false,
    ['De pie, pies a la anchura de las caderas, rodillas sueltas y manos en la cintura.', 'Lleva la cadera hacia atrás e inclina el tronco con la espalda recta hasta notar tensión detrás de los muslos; sube apretando los glúteos.', 'La espalda recta durante todo el movimiento; las rodillas casi no se doblan.', 'Redondear la espalda o doblar mucho las rodillas.', 'Baja menos.'],
    ['Frontissa de maluc sense pes', 'Isquiotibials i zona lumbar', 'Dempeus, peus a l’amplada dels malucs, genolls lliures i mans a la cintura.', 'Porta el maluc enrere i inclina el tronc amb l’esquena recta fins a notar tensió darrere de les cuixes; puja estrenyent els glutis.', 'L’esquena recta durant tot el moviment; els genolls gairebé no es dobleguen.', 'Arrodonir l’esquena o doblegar molt els genolls.', 'Baixa menys.'],
    ['Bodyweight hip hinge', 'Hamstrings and lower back', 'Stand with your feet hip-width apart, knees soft and hands on your waist.', 'Push your hips back and tip your torso forward with a straight back until you feel the back of your thighs; come up squeezing your glutes.', 'Keep your back straight throughout; your knees barely bend.', 'Rounding your back or bending your knees a lot.', 'Go down less.'], ['gentle']),
  x('calentamiento', NEW_GROUP, 'Patinador', 'Piernas', '', '+cuadriceps +gluteos ~gemelos ~aductores', false,
    ['De pie sobre una pierna, rodilla algo flexionada y la otra pierna cruzada por detrás.', 'Salta de lado y cae sobre la otra pierna, llevando la contraria cruzada por detrás y balanceando los brazos, como un patinador.', 'Cae con suavidad y la rodilla flexionada.', 'Caer con la pierna rígida o dejar que la rodilla se vaya hacia dentro.', 'Sin saltar: da un paso largo al lado.'],
    ['Patinador', 'Cames', 'Dempeus sobre una cama, genoll una mica flexionat i l’altra cama creuada per darrere.', 'Salta de costat i cau sobre l’altra cama, portant la contrària creuada per darrere i balancejant els braços, com un patinador.', 'Cau amb suavitat i el genoll flexionat.', 'Caure amb la cama rígida o deixar que el genoll se’n vagi cap endins.', 'Sense saltar: fes una passa llarga al costat.'],
    ['Skaters', 'Legs', 'Stand on one leg with the knee slightly bent and the other leg crossed behind.', 'Jump to the side and land on the other leg, crossing the free leg behind and swinging your arms, like a skater.', 'Land softly with your knee bent.', 'Landing with a stiff leg or letting the knee cave in.', 'No jumping: take a long step to the side.']),

];

import { Question } from '@/types';

export const QUESTIONS: Question[] = [
    {
        id: 1,
        text: {
            ja: "人生を左右する大きな決断をする時、あなたの『正解』はどこにありますか？",
            en: "When making a life-changing decision, where do you find your 'truth'?",
            es: "Cuando tomas una decisión que cambia tu vida, ¿dónde encuentras tu 'verdad'?"
        },
        optionA: {
            ja: "その瞬間の「直感」や「身体の反応」が全てだ。",
            en: "It's all about my 'intuition' or 'gut reaction' in the moment.",
            es: "Todo se trata de mi 'intuición' o 'reacción visceral' en el momento."
        },
        optionB: {
            ja: "一晩寝かせて、感情の波が静まるのを待ってから決める。",
            en: "I sleep on it and wait for the emotional wave to settle.",
            es: "Lo consulto con la almohada y espero a que la ola emocional se calme."
        },
        type: "HumanDesign_Authority"
    },
    {
        id: 2,
        text: {
            ja: "あなたが最も恐れている『人生のバッドエンド』はどちらですか？",
            en: "Which 'bad ending' in life do you fear the most?",
            es: "¿Cuál 'mal final' en la vida temes más?"
        },
        optionA: {
            ja: "誰からも必要とされず、価値がないと思われること。",
            en: "Being unneeded by anyone and seen as worthless.",
            es: "No ser necesitado por nadie y ser visto como inútil."
        },
        optionB: {
            ja: "自由を奪われ、何かにコントロールされて生きること。",
            en: "Being deprived of freedom and controlled by something.",
            es: "Ser privado de libertad y controlado por algo."
        },
        type: "Enneagram_Fear"
    },
    {
        id: 3,
        text: {
            ja: "新しい情報を学ぶ時、どちらのスタイルが心地よいですか？",
            en: "Which style do you prefer when learning new information?",
            es: "¿Qué estilo prefieres al aprender nueva información?"
        },
        optionA: {
            ja: "全体の概念や理論、隠された意味をまず理解したい。",
            en: "I want to understand the overall concept, theory, and hidden meanings first.",
            es: "Quiero entender primero el concepto general, la teoría y los significados ocultos."
        },
        optionB: {
            ja: "具体的なデータ、事実、五感で確かめられる実例が欲しい。",
            en: "I want concrete data, facts, and tangible examples.",
            es: "Quiero datos concretos, hechos y ejemplos tangibles."
        },
        type: "MBTI_N_S"
    },
    {
        id: 4,
        text: {
            ja: "集団の中にいる時のあなたは、どちらの役割に近いですか？",
            en: "When you are in a group, which role is closer to you?",
            es: "Cuando estás en un grupo, ¿qué rol es más cercano a ti?"
        },
        optionA: {
            ja: "自ら提案し、周りを巻き込んでエネルギーを生み出す。",
            en: "I propose ideas and energize those around me.",
            es: "Propongo ideas y energizo a quienes me rodean."
        },
        optionB: {
            ja: "周りの動きを見て、求められたことに全力で応える。",
            en: "I observe the flow and respond fully to what is asked.",
            es: "Observo el flujo y respondo plenamente a lo que se pide."
        },
        type: "HumanDesign_Type"
    },
    {
        id: 5,
        text: {
            ja: "限界まで追い詰められた時、ついやってしまうのは？",
            en: "What do you tend to do when pushed to your limit?",
            es: "¿Qué sueles hacer cuando estás al límite?"
        },
        optionA: {
            ja: "感情的になり、誰かに当たり散らすか、泣いて発散する。",
            en: "I get emotional, lash out at someone, or cry it out.",
            es: "Me pongo emocional, arremeto contra alguien o lloro."
        },
        optionB: {
            ja: "殻に閉じこもり、一人で冷静になるまで情報を遮断する。",
            en: "I withdraw into my shell and shut out information until I calm down.",
            es: "Me retiro a mi caparazón y bloqueo la información hasta que me calmo."
        },
        type: "Moon_Stress"
    },
    {
        id: 6,
        text: {
            ja: "どちらの人生により強い憧れを感じますか？",
            en: "Which life do you aspire to more?",
            es: "¿A qué vida aspiras más?"
        },
        optionA: {
            ja: "多くの人に影響を与え、社会的な成功と名声を得る人生。",
            en: "A life of social success and fame, influencing many people.",
            es: "Una vida de éxito social y fama, influyendo a muchas personas."
        },
        optionB: {
            ja: "自分の美学を貫き、精神的な深みと平穏を知る人生。",
            en: "A life of sticking to my aesthetics and knowing spiritual depth and peace.",
            es: "Una vida apegada a mi estética y conociendo la profundidad espiritual y la paz."
        },
        type: "Jupiter_Value"
    },
    {
        id: 7,
        text: {
            ja: "予期せぬトラブルが起きた時、本音ではどう感じますか？",
            en: "How do you honestly feel when unexpected trouble occurs?",
            es: "¿Cómo te sientes honestamente cuando ocurre un problema inesperado?"
        },
        optionA: {
            ja: "「面倒くさい」と感じ、いつものルーチンが乱れるのを嫌う。",
            en: "I feel it's a hassle and hate my routine being disturbed.",
            es: "Siento que es una molestia y odio que mi rutina sea perturbada."
        },
        optionB: {
            ja: "「どう切り抜けようか」と、少しワクワクする自分がいる。",
            en: "I feel a bit excited, thinking 'how shall I get through this?'.",
            es: "Me siento un poco emocionado, pensando '¿cómo saldré de esto?'."
        },
        type: "Uranus_Change"
    },
    {
        id: 8,
        text: {
            ja: "大切な人に対して、あなたがしがちな愛情表現は？",
            en: "What is your typical expression of love for someone important?",
            es: "¿Cuál es tu expresión típica de amor por alguien importante?"
        },
        optionA: {
            ja: "言葉で感謝を伝えたり、頻繁に連絡を取り合う。",
            en: "Expressing gratitude in words or keeping in frequent contact.",
            es: "Expresar gratitud con palabras o mantener contacto frecuente."
        },
        optionB: {
            ja: "相手のために行動したり、何か役に立つことをしてあげる。",
            en: "Taking action for them or doing something useful.",
            es: "Tomar acción por ellos o hacer algo útil."
        },
        type: "Venus_LoveLang"
    },
    {
        id: 9,
        text: {
            ja: "今、あなたが『克服しなければならない』と感じている壁は？",
            en: "What barrier do you feel you must overcome right now?",
            es: "¿Qué barrera sientes que debes superar ahora mismo?"
        },
        optionA: {
            ja: "自分自身の能力不足や、将来への漠然とした不安。",
            en: "My own lack of ability or vague anxiety about the future.",
            es: "Mi propia falta de capacidad o ansiedad vaga sobre el futuro."
        },
        optionB: {
            ja: "職場環境や特定の他者との終わらない摩擦。",
            en: "Workplace environment or endless friction with specific others.",
            es: "Entorno laboral o fricción interminable con otros específicos."
        },
        type: "Saturn_Challenge"
    },
    {
        id: 10,
        text: {
            ja: "もし生まれ変わるなら、次はどちらを選びますか？",
            en: "If you were reincarnated, which would you choose next?",
            es: "Si reencarnaras, ¿cuál elegirías después?"
        },
        optionA: {
            ja: "波乱万丈でも、歴史に名を残す英雄。",
            en: "A hero who leaves a name in history, even if life is turbulent.",
            es: "Un héroe que deja un nombre en la historia, incluso si la vida es turbulenta."
        },
        optionB: {
            ja: "穏やかで、愛する人たちに囲まれた賢者。",
            en: "A sage surrounded by loved ones, living a peaceful life.",
            es: "Un sabio rodeado de seres queridos, viviendo una vida pacífica."
        },
        type: "Core_Identity"
    }
];

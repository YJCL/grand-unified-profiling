import { Language } from '@/types';

export const TRANSLATIONS: Record<Language, {
    title: string;
    subtitle: string;
    initialize: string;
    configTitle: string;
    configDesc: string;
    nameLabel: string;
    namePlaceholder: string;
    dateLabel: string;
    timeLabel: string;
    placeLabel: string;
    placePlaceholder: string;
    genderLabel: string;
    genderSelect: string;
    genderMale: string;
    genderFemale: string;
    genderOther: string;
    worryLabel: string;
    worryPlaceholder: string;
    startCalibration: string;
    sequenceStatus: string;
    integrity: string;
    optionPrefix: string;
    analyzing: string[];
    resultTitle: string;
    reInitialize: string;
    coreEssence: string;
    operationalStrategy: string;
    temporalAlignment: string;
    masterGuidance: string;
    currentFrequency: string;
    catalyticAction: string;
}> = {
    ja: {
        title: "Grand Unified Fortune",
        subtitle: "西洋・東洋占星術、心理学、ヒューマンデザインを統合した究極の自己解析シミュレーター",
        initialize: "鑑定を始める",
        configTitle: "プロフィール入力",
        configDesc: "正確な鑑定のために、あなたの情報を入力してください",
        nameLabel: "お名前",
        namePlaceholder: "お名前を入力",
        dateLabel: "生年月日",
        timeLabel: "出生時間",
        placeLabel: "出生地",
        placePlaceholder: "例: 東京都千代田区",
        genderLabel: "性別",
        genderSelect: "選択してください",
        genderMale: "男性",
        genderFemale: "女性",
        genderOther: "その他",
        worryLabel: "現在のお悩み",
        worryPlaceholder: "悩みや知りたいことを具体的に書いてください...",
        startCalibration: "診断に進む",
        sequenceStatus: "回答状況",
        integrity: "進捗率",
        optionPrefix: "選択肢",
        analyzing: [
            "星の配置を読み解いています...",
            "あなたの本質を分析中...",
            "深層心理にアクセス中...",
            "鑑定結果を生成中..."
        ],
        resultTitle: "鑑定結果",
        reInitialize: "もう一度占う",
        coreEssence: "魂の本質",
        operationalStrategy: "行動戦略",
        temporalAlignment: "今の運気",
        masterGuidance: "アドバイス",
        currentFrequency: "今日のテーマ",
        catalyticAction: "ラッキーアクション"
    },
    en: {
        title: "Grand Unified Fortune",
        subtitle: "The ultimate self-analysis simulator integrating Western & Eastern Astrology, Psychology, and Human Design.",
        initialize: "Start Reading",
        configTitle: "Profile Entry",
        configDesc: "Please enter your details for an accurate reading.",
        nameLabel: "Name",
        namePlaceholder: "Your Name",
        dateLabel: "Date of Birth",
        timeLabel: "Time of Birth",
        placeLabel: "Place of Birth",
        placePlaceholder: "City, Region",
        genderLabel: "Gender",
        genderSelect: "Select",
        genderMale: "Male",
        genderFemale: "Female",
        genderOther: "Other",
        worryLabel: "Current Worry",
        worryPlaceholder: "Describe what's on your mind...",
        startCalibration: "Next Step",
        sequenceStatus: "Progress",
        integrity: "Completed",
        optionPrefix: "Option",
        analyzing: [
            "Reading the stars...",
            "Analyzing your essence...",
            "Connecting to your psyche...",
            "Creating your profile..."
        ],
        resultTitle: "Your Profile",
        reInitialize: "Start Over",
        coreEssence: "Core Essence",
        operationalStrategy: "Strategy",
        temporalAlignment: "Current Timing",
        masterGuidance: "Guidance",
        currentFrequency: "Daily Theme",
        catalyticAction: "Lucky Action"
    },
    es: {
        title: "Grand Unified Fortune",
        subtitle: "El simulador de autoanálisis definitivo que integra Astrología Occidental y Oriental, Psicología y Diseño Humano.",
        initialize: "Comenzar",
        configTitle: "Perfil",
        configDesc: "Ingresa tus datos para una lectura precisa.",
        nameLabel: "Nombre",
        namePlaceholder: "Tu Nombre",
        dateLabel: "Fecha de Nacimiento",
        timeLabel: "Hora de Nacimiento",
        placeLabel: "Lugar de Nacimiento",
        placePlaceholder: "Ciudad, Región",
        genderLabel: "Género",
        genderSelect: "Seleccionar",
        genderMale: "Masculino",
        genderFemale: "Femenino",
        genderOther: "Otro",
        worryLabel: "Preocupación Actual",
        worryPlaceholder: "Describe qué te preocupa...",
        startCalibration: "Siguiente",
        sequenceStatus: "Progreso",
        integrity: "Completado",
        optionPrefix: "Opción",
        analyzing: [
            "Leyendo las estrellas...",
            "Analizando tu esencia...",
            "Conectando con tu psique...",
            "Creando tu perfil..."
        ],
        resultTitle: "Tu Perfil",
        reInitialize: "Empezar de Nuevo",
        coreEssence: "Esencia Central",
        operationalStrategy: "Estrategia",
        temporalAlignment: "Alineación Temporal",
        masterGuidance: "Consejo",
        currentFrequency: "Tema Diario",
        catalyticAction: "Acción de Suerte"
    }
};

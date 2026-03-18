import {
    Hand,
    Fingerprint,
    PenTool,
    GitGraph,
    Footprints,
    ThumbsUp,
    Pencil,
    UtensilsCrossed,
    BookOpen,
    Smartphone,
    Grip,
    type LucideIcon,
} from "lucide-react";

export interface TemplateControl {
    id: string;
    label: string;
    clinicalLabel?: string;   // Label amigable para terapeutas
    clinicalHint?: string;    // Tooltip con contexto clínico
    min: number;
    max: number;
    step: number;
    default: number;
    impacts: Record<string, { operation: string; value?: number }>;
}

export interface TemplateConfig {
    id: string;
    name: string;
    description: string;
    category: string;
    icon: LucideIcon;
    defaultParams: Record<string, any>;
    controls: TemplateControl[];
}

// --- Controles base reutilizables ---
const flattenControl: TemplateControl = {
    id: "isFlat", label: "Aplanar (Patrón)",
    clinicalLabel: "Ver patrón plano",
    clinicalHint: "Despliega la férula como patrón 2D para recorte o referencia.",
    min: 0, max: 1, step: 1, default: 0,
    impacts: { "isFlat": { "operation": "set" } }
};

function makeControl(
    id: string, label: string, min: number, max: number, step: number, def: number,
    clinicalLabel?: string, clinicalHint?: string
): TemplateControl {
    return { id, label, clinicalLabel, clinicalHint, min, max, step, default: def, impacts: { [id]: { operation: "set" } } };
}

// ================================================================
// CATÁLOGO DE PLANTILLAS
// ================================================================
export const TEMPLATE_REGISTRY: Record<string, TemplateConfig> = {

    // ────────────────────────────────────────
    // MANO Y MUÑECA
    // ────────────────────────────────────────
    'wrist_splint': {
        id: 'wrist_splint',
        name: 'Férula de Muñeca (Volar)',
        category: 'mano',
        description: 'Férula estándar tipo canaleta para inmovilización de muñeca y antebrazo distal. Cara volar.',
        icon: Hand,
        defaultParams: {
            shapeType: 'channel',
            length: 220, widthProximal: 85, widthDistal: 60,
            thickness: 3, curvature: 190, color: "#20b2aa"
        },
        controls: [
            makeControl("length", "Largo", 100, 400, 1, 220, "Extensión", "Qué tan lejos sube por el antebrazo"),
            makeControl("widthProximal", "Ancho (Antebrazo)", 40, 150, 1, 85, "Ancho proximal", "Ajustar según circunferencia del antebrazo"),
            makeControl("widthDistal", "Ancho (Muñeca)", 30, 120, 1, 60, "Ancho distal", "Ajustar según circunferencia de muñeca"),
            makeControl("thickness", "Grosor", 1, 10, 0.1, 3, "Rigidez", "Más grueso = más rígido. 2-3mm para soporte, 4+ para inmovilización"),
            makeControl("curvature", "Cobertura (Grados)", 90, 360, 1, 190, "Cobertura", "Cuánto envuelve el brazo. 180°=media caña, 360°=circular"),
            flattenControl,
        ]
    },
    'wrist_dorsal': {
        id: 'wrist_dorsal',
        name: 'Férula de Muñeca (Dorsal / Cock-up)',
        category: 'mano',
        description: 'Férula dorsal tipo cock-up. Mantiene la muñeca en extensión funcional dejando la palma libre.',
        icon: Hand,
        defaultParams: {
            shapeType: 'channel',
            length: 200, widthProximal: 75, widthDistal: 65,
            thickness: 2.5, curvature: 160, color: "#6366f1"
        },
        controls: [
            makeControl("length", "Largo", 100, 350, 1, 200, "Extensión", "Largo sobre el dorso del antebrazo"),
            makeControl("widthProximal", "Ancho (Antebrazo)", 40, 130, 1, 75, "Ancho proximal", "Según circunferencia del antebrazo"),
            makeControl("widthDistal", "Ancho (Muñeca)", 30, 110, 1, 65, "Ancho distal", "Según circunferencia de muñeca"),
            makeControl("thickness", "Grosor", 1, 8, 0.1, 2.5, "Rigidez", "2-3mm flexible, 4+ rígido"),
            makeControl("curvature", "Cobertura (Grados)", 90, 270, 1, 160, "Cobertura", "Cuánto envuelve. Dorsal típico: 140-180°"),
            flattenControl,
        ]
    },
    'resting_hand': {
        id: 'resting_hand',
        name: 'Férula Palmar de Reposo',
        category: 'mano',
        description: 'Férula de reposo funcional. Cubre palma, muñeca y antebrazo. Para posicionamiento nocturno o post-quirúrgico.',
        icon: Hand,
        defaultParams: {
            shapeType: 'channel',
            length: 300, widthProximal: 100, widthDistal: 90,
            thickness: 3, curvature: 200, color: "#0ea5e9"
        },
        controls: [
            makeControl("length", "Largo Total", 200, 450, 1, 300, "Extensión total", "Cubre antebrazo + palma"),
            makeControl("widthProximal", "Ancho (Antebrazo)", 60, 150, 1, 100, "Ancho proximal", "Según circunferencia del antebrazo"),
            makeControl("widthDistal", "Ancho (Mano)", 50, 130, 1, 90, "Ancho distal", "Según ancho de la palma"),
            makeControl("thickness", "Grosor", 2, 10, 0.1, 3, "Rigidez", "Para reposo: 3mm mínimo recomendado"),
            makeControl("curvature", "Cobertura (Grados)", 120, 360, 1, 200, "Cobertura", "200° cubre bien sin comprimir"),
            flattenControl,
        ]
    },

    // ────────────────────────────────────────
    // DEDOS
    // ────────────────────────────────────────
    'finger_splint': {
        id: 'finger_splint',
        name: 'Férula de Dedo (Stack)',
        category: 'dedos',
        description: 'Inmovilización para falange distal. Diseño tipo Stack cerrado.',
        icon: Fingerprint,
        defaultParams: {
            shapeType: 'tube', capStyle: 'dome',
            length: 45, widthProximal: 20, widthDistal: 18,
            thickness: 1.5, curvature: 360, color: "#eab308"
        },
        controls: [
            makeControl("length", "Largo Total", 20, 80, 1, 45, "Largo", "Cuánto cubre del dedo"),
            makeControl("widthProximal", "Diámetro Base", 10, 35, 0.5, 20, "Diámetro base", "Según circunferencia de la falange proximal"),
            makeControl("widthDistal", "Diámetro Punta", 8, 30, 0.5, 18, "Diámetro punta", "Según circunferencia de la punta del dedo"),
            makeControl("thickness", "Grosor Pared", 0.8, 4, 0.1, 1.5, "Rigidez", "1-2mm para dedos"),
        ]
    },
    'finger_extension': {
        id: 'finger_extension',
        name: 'Férula de Extensión de Dedo',
        category: 'dedos',
        description: 'Canaleta abierta para mantener el dedo en extensión. Útil para dedo en martillo o post-cirugía de tendón extensor.',
        icon: Fingerprint,
        defaultParams: {
            shapeType: 'channel',
            length: 65, widthProximal: 22, widthDistal: 18,
            thickness: 1.5, curvature: 180, color: "#f97316"
        },
        controls: [
            makeControl("length", "Largo", 30, 100, 1, 65, "Extensión", "Largo de la canaleta"),
            makeControl("widthProximal", "Ancho Base", 12, 35, 0.5, 22, "Ancho base", "Ajustar al grosor del dedo"),
            makeControl("widthDistal", "Ancho Punta", 10, 30, 0.5, 18, "Ancho punta", "Ligeramente menor que la base"),
            makeControl("thickness", "Grosor", 0.8, 4, 0.1, 1.5, "Rigidez", "1.5mm para extensión, 2+ para inmovilización total"),
            makeControl("curvature", "Cobertura (Grados)", 90, 270, 1, 180, "Cobertura", "180° = media caña abierta"),
            flattenControl,
        ]
    },
    'thumb_spica': {
        id: 'thumb_spica',
        name: 'Férula de Pulgar (Spica)',
        category: 'dedos',
        description: 'Inmovilización del pulgar incluyendo la articulación CMC. Para rizartrosis, De Quervain o fracturas del escafoides.',
        icon: ThumbsUp,
        defaultParams: {
            shapeType: 'spica',
            length: 120, widthProximal: 70, widthDistal: 30,
            thickness: 2.5, curvature: 220, color: "#ec4899",
            branchAngle: 35, thumbLength: 50, thumbWidth: 15
        },
        controls: [
            makeControl("length", "Largo Total", 80, 200, 1, 120, "Extensión", "Largo del cuerpo principal"),
            makeControl("widthProximal", "Ancho (Muñeca)", 40, 110, 1, 70, "Ancho muñeca", "Según circunferencia de muñeca"),
            makeControl("widthDistal", "Ancho (Pulgar)", 15, 50, 1, 30, "Ancho pulgar", "Según grosor del pulgar"),
            makeControl("thickness", "Grosor", 1.5, 6, 0.1, 2.5, "Rigidez", "2.5mm recomendado para Spica"),
            makeControl("curvature", "Cobertura (Grados)", 120, 360, 1, 220, "Cobertura", "220° envuelve sin apretar"),
            makeControl("branchAngle", "Ángulo Pulgar", 15, 60, 1, 35, "Ángulo de abducción", "Posición funcional del pulgar"),
            makeControl("thumbLength", "Largo Pulgar", 25, 80, 1, 50, "Largo del pulgar", "Hasta dónde cubre la rama"),
            makeControl("thumbWidth", "Ancho Pulgar", 8, 30, 1, 15, "Ancho rama", "Grosor de la rama del pulgar"),
            flattenControl,
        ]
    },

    // ────────────────────────────────────────
    // PIE Y TOBILLO
    // ────────────────────────────────────────
    'ankle_splint': {
        id: 'ankle_splint',
        name: 'Férula de Tobillo (AFO corta)',
        category: 'pie',
        description: 'Ortesis tobillo-pie corta. Para esguinces, inestabilidad o post-quirúrgico de tobillo.',
        icon: Footprints,
        defaultParams: {
            shapeType: 'channel',
            length: 280, widthProximal: 110, widthDistal: 90,
            thickness: 3.5, curvature: 200, color: "#14b8a6"
        },
        controls: [
            makeControl("length", "Largo (Pierna)", 180, 400, 1, 280, "Extensión", "Qué tan alto sube por la pierna"),
            makeControl("widthProximal", "Ancho (Pantorrilla)", 70, 160, 1, 110, "Ancho pantorrilla", "Según circunferencia de la pantorrilla"),
            makeControl("widthDistal", "Ancho (Tobillo)", 50, 130, 1, 90, "Ancho tobillo", "Según circunferencia del tobillo"),
            makeControl("thickness", "Grosor", 2, 10, 0.1, 3.5, "Rigidez", "3.5mm+ para soporte de tobillo"),
            makeControl("curvature", "Cobertura (Grados)", 120, 360, 1, 200, "Cobertura", "200° para buena sujeción"),
            flattenControl,
        ]
    },
    'foot_orthotic': {
        id: 'foot_orthotic',
        name: 'Plantilla / Soporte Plantar',
        category: 'pie',
        description: 'Soporte plantar tipo plantilla. Baja curvatura para soporte de arco longitudinal.',
        icon: Footprints,
        defaultParams: {
            shapeType: 'channel',
            length: 260, widthProximal: 90, widthDistal: 75,
            thickness: 2, curvature: 120, color: "#a78bfa"
        },
        controls: [
            makeControl("length", "Largo (Pie)", 150, 320, 1, 260, "Largo del pie", "Desde talón hasta metatarso"),
            makeControl("widthProximal", "Ancho (Talón)", 50, 120, 1, 90, "Ancho talón", "Zona del retropié"),
            makeControl("widthDistal", "Ancho (Metatarso)", 40, 110, 1, 75, "Ancho metatarso", "Zona del antepié"),
            makeControl("thickness", "Grosor", 1, 6, 0.1, 2, "Rigidez", "2mm para soporte, más para corrección"),
            makeControl("curvature", "Curvatura del Arco", 90, 200, 1, 120, "Soporte de arco", "Mayor = más soporte del arco longitudinal"),
            flattenControl,
        ]
    },
    'toe_splint': {
        id: 'toe_splint',
        name: 'Férula de Dedo del Pie',
        category: 'pie',
        description: 'Férula tubular para inmovilización de dedo del pie. Para fracturas o hallux valgus.',
        icon: Footprints,
        defaultParams: {
            shapeType: 'tube', capStyle: 'dome',
            length: 40, widthProximal: 25, widthDistal: 22,
            thickness: 1.5, curvature: 360, color: "#06b6d4"
        },
        controls: [
            makeControl("length", "Largo", 20, 70, 1, 40),
            makeControl("widthProximal", "Diámetro Base", 15, 40, 0.5, 25),
            makeControl("widthDistal", "Diámetro Punta", 12, 35, 0.5, 22),
            makeControl("thickness", "Grosor", 0.8, 4, 0.1, 1.5),
        ]
    },

    // ────────────────────────────────────────
    // AYUDAS ADAPTATIVAS
    // ────────────────────────────────────────
    'writing_grip': {
        id: 'writing_grip',
        name: 'Adaptador de Escritura',
        category: 'adaptativas',
        description: 'Grip ergonómico para lápiz o bolígrafo. Facilita el agarre en pacientes con debilidad o espasticidad en la mano.',
        icon: Pencil,
        defaultParams: {
            shapeType: 'tube', capStyle: 'dome', boreRadius: 5,
            length: 60, widthProximal: 28, widthDistal: 15,
            thickness: 2, curvature: 360, color: "#f43f5e"
        },
        controls: [
            makeControl("length", "Largo del Grip", 30, 100, 1, 60),
            makeControl("widthProximal", "Diámetro (Agarre)", 15, 50, 0.5, 28),
            makeControl("widthDistal", "Diámetro (Lápiz)", 8, 25, 0.5, 15),
            makeControl("thickness", "Grosor Pared", 1, 5, 0.1, 2),
            makeControl("boreRadius", "Radio Orificio (Lápiz)", 2, 8, 0.5, 5),
        ]
    },
    'utensil_grip': {
        id: 'utensil_grip',
        name: 'Adaptador de Cubiertos',
        category: 'adaptativas',
        description: 'Mango engrosado para cubiertos. Mejora el agarre para pacientes con artritis, debilidad o limitación de prensión.',
        icon: UtensilsCrossed,
        defaultParams: {
            shapeType: 'tube', capStyle: 'dome', boreRadius: 6,
            length: 100, widthProximal: 40, widthDistal: 18,
            thickness: 2.5, curvature: 360, color: "#84cc16"
        },
        controls: [
            makeControl("length", "Largo del Mango", 60, 150, 1, 100),
            makeControl("widthProximal", "Diámetro (Agarre)", 25, 60, 0.5, 40),
            makeControl("widthDistal", "Diámetro (Cubierto)", 10, 30, 0.5, 18),
            makeControl("thickness", "Grosor Pared", 1.5, 6, 0.1, 2.5),
            makeControl("boreRadius", "Radio Orificio (Cubierto)", 3, 10, 0.5, 6),
        ]
    },
    'book_holder': {
        id: 'book_holder',
        name: 'Soporte para Lectura',
        category: 'adaptativas',
        description: 'Soporte tipo atril plano para sostener libros o tablets. Ángulo ajustable para lectura sin esfuerzo manual.',
        icon: BookOpen,
        defaultParams: {
            shapeType: 'plate', bendAngle: 110, bendPoint: 0.3, lipHeight: 15,
            length: 250, widthProximal: 200, widthDistal: 200,
            thickness: 3, curvature: 110, color: "#8b5cf6"
        },
        controls: [
            makeControl("length", "Largo (Alto)", 150, 350, 1, 250),
            makeControl("widthProximal", "Ancho Inferior", 100, 300, 1, 200),
            makeControl("widthDistal", "Ancho Superior", 100, 300, 1, 200),
            makeControl("thickness", "Grosor", 2, 8, 0.1, 3),
            makeControl("bendAngle", "Ángulo de Doblez", 90, 160, 1, 110),
            makeControl("bendPoint", "Punto de Doblez", 0.15, 0.5, 0.05, 0.3),
            makeControl("lipHeight", "Alto del Labio", 5, 40, 1, 15),
            flattenControl,
        ]
    },
    'phone_holder': {
        id: 'phone_holder',
        name: 'Soporte para Celular / Tablet',
        category: 'adaptativas',
        description: 'Soporte adaptado para sujetar dispositivos móviles. Para pacientes con movilidad reducida en miembros superiores.',
        icon: Smartphone,
        defaultParams: {
            shapeType: 'plate', bendAngle: 100, bendPoint: 0.25, lipHeight: 10,
            length: 140, widthProximal: 80, widthDistal: 75,
            thickness: 2.5, curvature: 130, color: "#64748b"
        },
        controls: [
            makeControl("length", "Largo", 80, 250, 1, 140),
            makeControl("widthProximal", "Ancho Inferior", 50, 150, 1, 80),
            makeControl("widthDistal", "Ancho Superior", 50, 150, 1, 75),
            makeControl("thickness", "Grosor", 1.5, 6, 0.1, 2.5),
            makeControl("bendAngle", "Ángulo de Doblez", 80, 150, 1, 100),
            makeControl("bendPoint", "Punto de Doblez", 0.15, 0.5, 0.05, 0.25),
            makeControl("lipHeight", "Alto del Labio", 5, 25, 1, 10),
            flattenControl,
        ]
    },
    'universal_cuff': {
        id: 'universal_cuff',
        name: 'Cuff Universal (Agarrador)',
        category: 'adaptativas',
        description: 'Banda palmar con ranura para insertar objetos (cubiertos, cepillo, lápiz). Para pacientes sin prensión activa.',
        icon: Grip,
        defaultParams: {
            shapeType: 'band', slotWidth: 15,
            length: 80, widthProximal: 75, widthDistal: 70,
            thickness: 2, curvature: 300, color: "#d946ef"
        },
        controls: [
            makeControl("length", "Ancho de Banda", 40, 120, 1, 80),
            makeControl("widthProximal", "Circunferencia (Palma)", 50, 110, 1, 75),
            makeControl("widthDistal", "Circunferencia (Dorso)", 45, 105, 1, 70),
            makeControl("thickness", "Grosor", 1, 5, 0.1, 2),
            makeControl("curvature", "Cobertura (Grados)", 180, 360, 1, 300),
            makeControl("slotWidth", "Ancho Ranura", 5, 30, 1, 15),
        ]
    },

    // ────────────────────────────────────────
    // DISEÑO LIBRE
    // ────────────────────────────────────────
    'custom_nodes': {
        id: 'custom_nodes',
        name: 'Diseño Libre (Nodos)',
        category: 'libre',
        description: 'Crea una ortesis desde cero conectando nodos geométricos en el editor visual.',
        icon: GitGraph,
        defaultParams: {},
        controls: []
    }
};

// --- Categorías para la UI ---
export interface TemplateCategory {
    id: string;
    label: string;
    icon: LucideIcon;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
    { id: 'mano', label: 'Mano y Muñeca', icon: Hand },
    { id: 'dedos', label: 'Dedos', icon: Fingerprint },
    { id: 'pie', label: 'Pie y Tobillo', icon: Footprints },
    { id: 'adaptativas', label: 'Ayudas Adaptativas', icon: PenTool },
    { id: 'libre', label: 'Diseño Libre', icon: GitGraph },
];

// Helper: obtener plantillas de una categoría
export function getTemplatesByCategory(categoryId: string): TemplateConfig[] {
    return Object.values(TEMPLATE_REGISTRY).filter(t => t.category === categoryId);
}

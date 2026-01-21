import { Hand, Footprints, PenTool, GitGraph } from "lucide-react";

export interface TemplateConfig {
    id: string;
    name: string;
    description: string;
    icon: any;
    defaultParams: any;
    controls: any[];
}

export const TEMPLATE_REGISTRY: Record<string, TemplateConfig> = {
    'wrist_splint': {
        id: 'wrist_splint',
        name: 'Férula de Muñeca (Antebrazo)',
        description: 'Férula estándar tipo canaleta para inmovilización de muñeca y antebrazo distal.',
        icon: Hand,
        defaultParams: {
            length: 220,
            widthProximal: 85,
            widthDistal: 60,
            thickness: 3,
            curvature: 190,
            color: "#20b2aa"
        },
        controls: [
            {
                id: "length",
                label: "Largo",
                min: 100, max: 400, step: 1, default: 220,
                impacts: { "length": { "operation": "set" } }
            },
            {
                id: "widthProximal",
                label: "Ancho (Antebrazo)",
                min: 40, max: 150, step: 1, default: 85,
                impacts: { "widthProximal": { "operation": "set" } }
            },
            {
                id: "widthDistal",
                label: "Ancho (Muñeca)",
                min: 30, max: 120, step: 1, default: 60,
                impacts: { "widthDistal": { "operation": "set" } }
            },
            {
                id: "thickness",
                label: "Grosor",
                min: 1, max: 10, step: 0.1, default: 3,
                impacts: { "thickness": { "operation": "set" } }
            },
            {
                id: "curvature",
                label: "Cobertura (Grados)",
                min: 90, max: 360, step: 1, default: 190,
                impacts: { "curvature": { "operation": "set" } }
            },
            {
                id: "isFlat",
                label: "Aplanar (Patrón)",
                min: 0, max: 1, step: 1, default: 0,
                impacts: { "isFlat": { "operation": "set" } }
            }
        ]
    },
    'finger_splint': {
        id: 'finger_splint',
        name: 'Férula de Dedo (Stack)',
        description: 'Inmovilización para falange distal. Diseño tipo Stack cerrado.',
        icon: PenTool,
        defaultParams: {
            length: 45,
            widthProximal: 20,
            widthDistal: 18,
            thickness: 1.5,
            curvature: 360, // Cerrada
            color: "#eab308"
        },
        controls: [
             {
                id: "length", label: "Largo Total", min: 20, max: 80, step: 1, default: 45,
                impacts: { "length": { "operation": "set" } }
            },
            {
                id: "widthProximal", label: "Diámetro Base", min: 10, max: 35, step: 0.5, default: 20,
                impacts: { "widthProximal": { "operation": "set" } }
            },
            {
                id: "thickness", label: "Grosor Pared", min: 0.8, max: 4, step: 0.1, default: 1.5,
                impacts: { "thickness": { "operation": "set" } }
            }
        ]
    },
    'custom_nodes': {
        id: 'custom_nodes',
        name: 'Diseño Libre (Nodos)',
        description: 'Crea una ortesis desde cero conectando nodos geométricos.',
        icon: GitGraph,
        defaultParams: {},
        controls: [] // Los controles se generan dinámicamente en el editor de nodos
    }
};

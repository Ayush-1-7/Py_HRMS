/* ══════════════════════════════════════════════════════════
   AI Schema Intelligence — Dynamic Metadata Extraction
   ══════════════════════════════════════════════════════════ */

import mongoose from "mongoose";
import { connectDB } from "@/config/mongodb";

// Pre-load models to ensure they are registered with Mongoose
import "@/models/Employee";
import "@/models/Attendance";
import "@/models/User";
import "@/models/Setting";

export interface SchemaField {
    path: string;
    instance: string;
    required: boolean;
    options: any;
}

export interface ModelMetadata {
    name: string;
    collection: string;
    fields: SchemaField[];
}

/**
 * Dynamically extract metadata for all registered Mongoose models.
 */
export async function getSchemaMetadata(): Promise<ModelMetadata[]> {
    await connectDB();

    const models = mongoose.modelNames();
    const metadata: ModelMetadata[] = [];

    for (const name of models) {
        const model = mongoose.model(name);
        const schema = model.schema;
        const fields: SchemaField[] = [];

        schema.eachPath((path: string, type: any) => {
            // Skip internal Mongoose fields and sensitive fields
            if (path.startsWith("_") || path === "__v" || path === "password") return;

            fields.push({
                path,
                instance: type.instance,
                required: !!type.options?.required,
                options: type.options
            });
        });

        metadata.push({
            name,
            collection: model.collection.name,
            fields
        });
    }

    return metadata;
}

/**
 * Get available fields for a specific model.
 */
export async function getModelFields(modelName: string): Promise<string[]> {
    const meta = await getSchemaMetadata();
    const target = meta.find(m => m.name.toLowerCase() === modelName.toLowerCase() || m.collection.toLowerCase() === modelName.toLowerCase());
    return target ? target.fields.map(f => f.path) : [];
}

/**
 * Check if a field exists in any model.
 */
export async function findFieldInfo(fieldName: string) {
    const meta = await getSchemaMetadata();
    const results: { model: string, field: SchemaField }[] = [];

    for (const m of meta) {
        const field = m.fields.find(f => f.path.toLowerCase() === fieldName.toLowerCase());
        if (field) {
            results.push({ model: m.name, field });
        }
    }

    return results;
}

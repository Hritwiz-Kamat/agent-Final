/**
 * AgentBridge Server — Request Validation Middleware
 * Validates request bodies against Zod schemas.
 */
import { z, type ZodSchema } from 'zod';
import type { Request, Response, NextFunction } from 'express';
/**
 * Creates an Express middleware that validates `req.body` against a Zod schema.
 * On success, replaces `req.body` with the parsed (typed) result.
 * On failure, returns a 400 error with detailed validation messages.
 */
export declare function validateBody<T extends ZodSchema>(schema: T): (req: Request, res: Response, next: NextFunction) => void;
export declare const extractSchema: z.ZodObject<{
    url: z.ZodString;
    format: z.ZodDefault<z.ZodEnum<["mcp", "raw", "text"]>>;
    chineseCompression: z.ZodDefault<z.ZodBoolean>;
    waitUntil: z.ZodDefault<z.ZodEnum<["load", "domcontentloaded", "networkidle0", "networkidle2"]>>;
}, "strip", z.ZodTypeAny, {
    url: string;
    chineseCompression: boolean;
    waitUntil: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
    format: "text" | "mcp" | "raw";
}, {
    url: string;
    chineseCompression?: boolean | undefined;
    waitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2" | undefined;
    format?: "text" | "mcp" | "raw" | undefined;
}>;
export declare const actionsSchema: z.ZodObject<{
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    url: string;
}, {
    url: string;
}>;
export declare const executeSchema: z.ZodObject<{
    url: z.ZodString;
    selector: z.ZodString;
    action: z.ZodEnum<["click", "fill", "select"]>;
    value: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    url: string;
    selector: string;
    action: "select" | "click" | "fill";
    value?: string | undefined;
}, {
    url: string;
    selector: string;
    action: "select" | "click" | "fill";
    value?: string | undefined;
}>;
export type ExtractInput = z.infer<typeof extractSchema>;
export type ActionsInput = z.infer<typeof actionsSchema>;
export type ExecuteInput = z.infer<typeof executeSchema>;
//# sourceMappingURL=validation.d.ts.map
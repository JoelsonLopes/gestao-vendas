import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

type ValidationTarget = 'body' | 'params' | 'query';

/**
 * Middleware de validação genérico usando Zod
 * @param schema Schema Zod para validação
 * @param target Onde validar (body, params, query)
 */
export function validate<T extends z.ZodSchema>(
  schema: T,
  target: ValidationTarget = 'body'
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = target === 'body' ? req.body : 
                           target === 'params' ? req.params :
                           req.query;
      
      const validatedData = await schema.parseAsync(dataToValidate);
      
      // Sobrescrever com dados validados
      if (target === 'body') {
        req.body = validatedData;
      } else if (target === 'params') {
        req.params = validatedData;
      } else {
        req.query = validatedData;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Falha na validação",
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}

/**
 * Middleware para validar múltiplas fontes
 */
export function validateMultiple(validations: {
  schema: z.ZodSchema;
  target: ValidationTarget;
}[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      for (const { schema, target } of validations) {
        const dataToValidate = target === 'body' ? req.body : 
                             target === 'params' ? req.params :
                             req.query;
        
        const validatedData = await schema.parseAsync(dataToValidate);
        
        if (target === 'body') {
          req.body = validatedData;
        } else if (target === 'params') {
          req.params = validatedData;
        } else {
          req.query = validatedData;
        }
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Falha na validação",
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
} 
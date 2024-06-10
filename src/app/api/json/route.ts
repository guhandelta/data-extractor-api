import { NextRequest, NextResponse } from "next/server";
import { ZodTypeAny, z } from "zod";

export const GET = async (req: NextRequest) => {
    return new Response("Hello, world!", { status: 200 });
};

// fn() to detect the type of schema, Eg: Object, Array, String, Number, Boolean
const determineSchemaType = (schema: any) => {
    // Append the type with whatever type that is received

    // Check for the property `type` in the Object
    if (!schema.hasOwnProperty("type")) {
        if(Array.isArray(schema)) {
            return "array";
        } else {
            return typeof schema; // string or anyother primitive typ
        }
    }
    
    // If the property `type` is present in the Object, return the type of the schema
    return schema.type;
}

// Here the Schema can be anything, an Object or String or Boolen.... so the expected PropType is any/unknown
// The fn() returns a ZodTypeAny, which can be any Zod type, Eg: z.string(), z.number(), z.boolean(), z.object(), z.array()
const jsonSchemaToZod = (schema: any): ZodTypeAny => {

    const type = determineSchemaType(schema);

    switch(type) {
        case "string": {
            // If the user sends any text like `I went to Harvard University`, the LLM will output { name: null }, it is allowed in Zon using hte .nullable().
            return z.string().nullable();
        }
        case "object": {
            // This shape would be of the type record an object that maps one thing to another, which here maps are string to ZodTypeAny
            const shape: Record<string, ZodTypeAny> = {};

            /* Iterate through the object and get the schema type of the property
            If the Object was like Eg: { name: { type: 'string' }, age: { type: 'number' } }
            The shape would be { name: string, age: number }, and while iterating through the keys of the object, the key would be name and the value would be a string, for the key age the value would be a number, just as the schema type of the property.
            */
            
            for (const key in schema) {
                if(key !== "type"){ // `type` is an internal key used to determine the datatype of the value, especially to this schema
                    // Recursively call the function to get the schema type of the property
                    // Copy over the keys that pass the schema, into the shape and map them to the ZodTypeAny

                    // Under the hood it is just conv { name: { type: string } } to { name: <zodSchemaForString> } => Converting a proprety syntax to a custom Zod schema that can actually be used for parsing

                    shape[key] = jsonSchemaToZod(schema[key]);
                }
            }

            // This shape can be used to validate the incoming data at runtime, using zod, Eg: { name: 'Mothi', age: 23 }, at runtime
            return z.object(shape);
        }
        case "array": {
            // jsonSchemaToZod() is called recursively as any item in the array can be an Object or any other non-primitive data type, so the recursive call goes down till it reaches a primitive data type.
            return z.array(jsonSchemaToZod(schema.items)).nullable();
        }
        case "number": {
            return z.number().nullable();
        }
        case "boolean": {
            return z.boolean().nullable();
        }
        default: {
            throw new Error(`Unsupported date type: ${type}`); 
        }
    
    }
}

export const POST = async (req: NextRequest) => {
    
    const body = await req.json(); 

    // Step 1: Define the schema to make sure the incoming data matches the expected format.
    const genericSchema = z.object({
        data: z.string(),
        // { data: 'Connect with Mothi', format: {} } would be the output when displaying genericSchema, as zod strips outany data from the incoming request data, that is not defined in the schema. Adding Passthrough() will allow the data to be displayed in the output. 
        format: z.object({}).passthrough()
    });

    // Parse the data against the schema, Using safeParse will return an object, but doesn't throw an error if the schema is not met.
    const { data, format } = genericSchema.parse(body); 
    console.log({ data, format }); 

    // Step 2: Define the schema in the user expected format(format/schema sent the req body, Eg: { name: string }).
    // Create a Schema based on the format/schema sent in the request body, if the reponse form the AI does not match the requirement, try repeating the request once more, using the retry mechanism.
    
    // If the parsing is successful then what the AI returned fits into the Schema perfectly
    const dynamicSchems = jsonSchemaToZod(format);

    // Step 3: Retry mechanisms
    // Informing TypeScript that the Promise Constructor may have a generic. Mentioning the generic is to make the Promise typesafe by mentioning the type of the value that the promise will resolve to.
    type PromiseExecutor<T> = (
        resolve: (value: T) => void,
        reject: (reason?: any) => void
    ) => void;

    class RetryablePromise<T> extends Promise<T> {
        // TypeScript will throw `Static members cannot reference class type parameters.` Error if the Generic is not declared here.
        static async retry<T>(
            retries: number,
            executor: PromiseExecutor<T>
        ): Promise<T> {
            return new RetryablePromise(executor).catch(error => { 
                console.error(`Retrying due to error: ${error}`);

                // If the 1st promise fails, retry the promise again through recursively calling the RetryablePromise, until the retries are greater than 0
                return retries > 0
                    ? RetryablePromise.retry(retries - 1, executor)
                    : RetryablePromise.reject(error);
            });
        }
    }

    const validationResult = RetryablePromise.retry<object>(5, (resolve, reject) => {
        try {
            // Call the AI to with the unstructured data
            const res = `{result: 'AI Response'}`; // AI Response

            // Validate the data against the schema
            const resultValidation = dynamicSchems.parse(JSON.parse(res));

            // Return the result if the validation/parsing is successful
            return resolve(resultValidation);
        } catch (error) {
            // If the validation/parsing fails, reject the promise and rerun the promise again, until the AI givse the correct response
            reject(error);
        }
    }); 

    return NextResponse.json(validationResult, { status: 200 });

};
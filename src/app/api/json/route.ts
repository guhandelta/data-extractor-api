import { NextRequest } from "next/server";
import { z } from "zod";

export const GET = async (req: NextRequest) => {
    return new Response("Hello, world!", { status: 200 });
};

export const POST = async (req: NextRequest) => {
    
    const body = await req.json(); 

    const genericSchema = z.object({
        data: z.string(),
        // { data: 'Connect with Mothi', format: {} } would be the outpu when displaying genericSchema, as zod strips outany data from the incoming request data, that is not defined in the schema 
        format: z.object({})
    });

    const res = genericSchema.parse(body); 
    console.log(res); 
    

    return new Response("OK", { status: 200 });

};
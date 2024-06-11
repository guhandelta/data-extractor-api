// Separating the expected JSON Model from the unstructured data
export const EXAMPLE_PROMPT = `DATA: \n"John is 25 years old and studies computer science at university"\n\n-----------\nExpected JSON format: 
{
    name: { type: "string" },
    age: { type: "number" },
    isStudent: { type: "boolean" },
    courses: {
        type: "array",
        items: { type: "string" },
    },
}
\n\n-----------\nValid JSON output in expected format:`

// Example JSON object that matches the schema/model :: Adding much examples to turn htis into a much more efficient and reliable model
export const EXAMPLE_ANSWER = `{
    name: "John",
    age: 25,
    isStudent: true,
    courses: ["computer science"],
}`
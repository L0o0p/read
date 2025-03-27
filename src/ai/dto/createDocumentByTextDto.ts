export class CreateDocumentByTextDto {
    name: string;
    text: string;
    indexing_technique: string;
    process_rule: {
        mode: string;
    };
}

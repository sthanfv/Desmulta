# **App Name**: VialClear

## Core Features:

- Eligibility Check: Check user's data against SIMIT to find debts eligible for legal removal.
- Administrative Management: Provide administrative steps necessary for a successful debt removal.
- User Interface: User-friendly interface for inputting data and displaying debt status.
- Contact Form: Form to collect user data to send to Firestore: `consultas_v2` (cedula, nombre, contacto, aceptoTerminos, status: 'pendiente', fuente: 'web').
- Database Storage: Store the collected data on Firestore database in `consultas_v2` collection.
- Whatsapp Validation: Validate Whatsapp Session tokens, rate limit to protect whatsapp number. Upstash (Redis) must be used to limit sends by IP
- Document Summarization Tool: Summarize legal documents related to debt removal using AI and provide a simplified explanation for the user. LLM will use reasoning to decide which laws to incorporate.

## Style Guidelines:

- Primary color: Regulation Yellow (#FFC107) to match the official transit aesthetic and draw user attention.
- Background color: Oxford Blue (#0F172A), a dark and serious tone that contrasts regulation yellow.
- Accent color: A slightly desaturated golden yellow (#D4A373), used sparingly for highlights and secondary actions.
- Body and headline font: 'Inter', a grotesque sans-serif font with a modern, neutral look suitable for both headlines and body text.
- Use icons from Lucide React, such as ShieldCheck, Clock, and FileX2, to represent legal checks, timing, and document status.
- Use a grid-based layout to ensure content is well-organized and responsive across different devices.
- Implement subtle transitions and animations when updating statuses.

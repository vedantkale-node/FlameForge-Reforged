import { app } from './app.js';

process.on('unhandledRejection', (reason: any) => {
    console.warn('Unhandled Rejection (caught gracefully):', reason?.message || reason);
});

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Server is now running and listening on port ${port}. Ready to handle incoming requests.`));

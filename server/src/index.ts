import { app } from './app';
import { config } from './lib/config';

app.listen(config.port, () => console.log(`API prête sur le port ${config.port}`));

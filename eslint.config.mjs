import {defineConfig} from 'eslint/config';
import croct from '@croct/eslint-plugin';

export default defineConfig(
    croct.configs.typescript,
);

/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { InCallRoot } from './src/app/InCallRoot';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('InCall', () => InCallRoot);

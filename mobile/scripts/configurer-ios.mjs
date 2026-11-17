// À lancer une fois après « npx cap add ios » : ajoute à Info.plist les textes d'autorisation en français
// et la déclaration de chiffrement standard, puis copie le fichier de confidentialité Apple (PrivacyInfo).
// Sans effet si les clés existent déjà (relançable sans risque).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const MOBILE = path.resolve(ici, '..');

export const CLES = [
  ['CFBundleDisplayName', 'string', 'Koki Connect'],
  ['CFBundleDevelopmentRegion', 'string', 'fr'],
  ['NSLocationWhenInUseUsageDescription', 'string', 'Koki Connect utilise votre position pour afficher les commerces et services proches de vous et pour réserver une course.'],
  ['NSCameraUsageDescription', 'string', 'Koki Connect utilise l’appareil photo pour ajouter la photo de votre boutique, de vos produits ou de votre profil.'],
  ['NSPhotoLibraryUsageDescription', 'string', 'Koki Connect accède à vos photos pour ajouter la photo de votre boutique, de vos produits ou de votre profil.'],
  ['ITSAppUsesNonExemptEncryption', 'false', null],
];

// Schéma de lien « kokiconnect:// » (raccourcis vers une rubrique, captures App Store automatiques).
export const SCHEMA_URL = '\t<key>CFBundleURLTypes</key>\n\t<array>\n\t\t<dict>\n\t\t\t<key>CFBundleURLName</key>\n\t\t\t<string>com.kokiconnect.app</string>\n\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array>\n\t\t\t\t<string>kokiconnect</string>\n\t\t\t</array>\n\t\t</dict>\n\t</array>\n';
export function ajouterSchema(xml) {
  if (/<string>kokiconnect<\/string>/.test(xml)) return xml;
  if (/<key>CFBundleURLTypes<\/key>/.test(xml)) throw new Error('Info.plist : CFBundleURLTypes existe déjà, ajouter « kokiconnect » à la main');
  const fin = xml.lastIndexOf('</dict>');
  return xml.slice(0, fin) + SCHEMA_URL + xml.slice(fin);
}

export function completerPlist(xml, cles = CLES) {
  let sortie = xml;
  for (const [cle, type, valeur] of cles) {
    if (new RegExp('<key>' + cle + '</key>').test(sortie)) continue;
    const ligne = '\t<key>' + cle + '</key>\n\t' + (type === 'string' ? '<string>' + valeur.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</string>' : '<' + type + '/>') + '\n';
    const fin = sortie.lastIndexOf('</dict>');
    if (fin < 0) throw new Error('Info.plist inattendu : </dict> introuvable');
    sortie = sortie.slice(0, fin) + ligne + sortie.slice(fin);
  }
  return sortie;
}

// Notifications (extension @capacitor/push-notifications) : AppDelegate.swift doit transmettre le jeton APNs à Capacitor.
export const METHODES_PUSH = `
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
`;
export function completerAppDelegate(swift) {
  if (/didRegisterForRemoteNotificationsWithDeviceToken/.test(swift)) return swift;
  const fin = swift.lastIndexOf('}');
  if (fin < 0 || !/class AppDelegate/.test(swift)) throw new Error('AppDelegate.swift inattendu : classe AppDelegate introuvable');
  return swift.slice(0, fin) + METHODES_PUSH + swift.slice(fin);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const plist = path.join(MOBILE, 'ios', 'App', 'App', 'Info.plist');
  if (!fs.existsSync(plist)) { console.error('Info.plist introuvable : lancez d’abord « npx cap add ios ».'); process.exit(1); }
  fs.writeFileSync(plist, ajouterSchema(completerPlist(fs.readFileSync(plist, 'utf8'))));
  const privacy = path.join(MOBILE, 'ios', 'App', 'App', 'PrivacyInfo.xcprivacy');
  if (!fs.existsSync(privacy)) fs.copyFileSync(path.join(MOBILE, 'ios-modeles', 'PrivacyInfo.xcprivacy'), privacy);
  const delegue = path.join(MOBILE, 'ios', 'App', 'App', 'AppDelegate.swift');
  if (fs.existsSync(delegue)) fs.writeFileSync(delegue, completerAppDelegate(fs.readFileSync(delegue, 'utf8')));
  console.log('Info.plist complété. Dans Xcode, ajoutez PrivacyInfo.xcprivacy à la cible App s’il n’y figure pas.');
}

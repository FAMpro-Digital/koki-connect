# Ajoute PrivacyInfo.xcprivacy aux ressources de la cible App (sans Xcode ouvert), une seule fois.
require 'xcodeproj'
projet_chemin = File.expand_path('../ios/App/App.xcodeproj', __dir__)
projet = Xcodeproj::Project.open(projet_chemin)
cible = projet.targets.find { |t| t.name == 'App' } or abort('Cible App introuvable')
groupe = projet.main_group.find_subpath('App', false) or abort('Groupe App introuvable')
if cible.resources_build_phase.files_references.any? { |f| f && f.path.to_s.end_with?('PrivacyInfo.xcprivacy') }
  puts 'PrivacyInfo.xcprivacy déjà dans la cible App'
else
  ref = groupe.files.find { |f| f.path == 'PrivacyInfo.xcprivacy' } || groupe.new_reference('PrivacyInfo.xcprivacy')
  cible.add_resources([ref])
  projet.save
  puts 'PrivacyInfo.xcprivacy ajouté à la cible App'
end

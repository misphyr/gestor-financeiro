#!/bin/bash
# Fix Java version after Capacitor sync

echo "Fixing Java versions in Gradle files..."

# Fix capacitor.build.gradle
sed -i 's/VERSION_21/VERSION_17/g' app/capacitor.build.gradle

# Fix capacitor-cordova-android-plugins
sed -i 's/VERSION_21/VERSION_17/g' capacitor-cordova-android-plugins/build.gradle

echo "Done!"

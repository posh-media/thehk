const fs = require('fs');
const path = require('path');

const files = [
  'react-native-screens/android/CMakeLists.txt',
  'react-native-worklets/android/CMakeLists.txt',
  'react-native-reanimated/android/CMakeLists.txt',
  'expo-modules-core/android/cmake/common.cmake',
  'react-native-gesture-handler/android/src/main/jni/CMakeLists.txt',
  'react-native-safe-area-context/android/src/main/jni/CMakeLists.txt',
];

let patched = 0;
let skipped = 0;

for (const rel of files) {
  const file = path.resolve(__dirname, '..', 'node_modules', rel);

  if (!fs.existsSync(file)) {
    console.warn(`[patch-native-stl] ${rel} not found; skipping.`);
    continue;
  }

  let content = fs.readFileSync(file, 'utf8');

  if (content.includes('find_library(CPP_SHARED_LIB c++_shared)')) {
    console.log(`[patch-native-stl] ${rel} already patched.`);
    skipped++;
    continue;
  }

  const findLibBlock = `find_library(CPP_SHARED_LIB c++_shared)
if(NOT CPP_SHARED_LIB)
  message(FATAL_ERROR "Could not find libc++_shared for \${ANDROID_ABI}")
endif()

`;

  content = content.replace(
    'target_link_libraries',
    findLibBlock + 'target_link_libraries'
  );

  content = content.replace(
    /(target_link_libraries\s*\([\s\S]*?)(\))/,
    '$1\n    ${CPP_SHARED_LIB}\n)'
  );

  fs.writeFileSync(file, content);
  console.log(`[patch-native-stl] Patched ${rel} to link libc++_shared.`);
  patched++;
}

if (patched > 0) {
  console.log(`[patch-native-stl] Patched ${patched} file(s), skipped ${skipped}.`);
} else if (skipped === files.length) {
  console.log('[patch-native-stl] All files already patched.');
}

"""Package only the standalone assets; never package the ZIP into itself."""
import pathlib
import sys
import zipfile

folder = pathlib.Path(sys.argv[1])
with zipfile.ZipFile(folder / 'plant-cover-trainer-offline.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in ['index.html', 'LICENSE.txt', '離線使用說明.txt']:
        archive.write(folder / name, name)

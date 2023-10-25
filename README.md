# Which Card Costs More?
Let's find out: https://squirrel-bat.github.io/which-costs-more/

## Development
### Prerequisites
* Python 3.x with [requests](https://pypi.org/project/requests/)
* local web server

### Local Setup
This project relies on an imported [bulk export from Scryfall's API](https://scryfall.com/docs/api/bulk-data).
For this purpose, we've got an import script written in python to fetch the latest file and create our own shrunken and compressed version as `./src/data.gzip`
> [!NOTE]
> Scryfall collects their bulk data only once every 12 hours. Please consider being a good citizen and run the importer only when you really must. 👍

To start the importer, run:
```shell
python ./import/importer.py
```

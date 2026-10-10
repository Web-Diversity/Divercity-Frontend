# Campus place search data

The local registry contains 65 real campus buildings and nearby cafes/restaurants from OpenStreetMap, retrieved 2026-10-02 using bounding box 126.953,37.493,126.960,37.500. It is place reference data, not example users or meetups. Individual objects retain their source URL in `src/components/campusPlaces.json`.

Source: https://api.openstreetmap.org/api/0.6/map?bbox=126.953,37.493,126.960,37.500
Copyright: © OpenStreetMap contributors, https://www.openstreetmap.org/copyright
Database license: ODbL 1.0, https://opendatacommons.org/licenses/odbl/1-0/

Core building names cross-checked against the official campus map: https://ssu.ac.kr/학교소개/캠퍼스안내/캠퍼스맵/
Search aliases use recognizable English campus names and Vietnamese descriptions. Proper business names remain unchanged. Geometry centers are approximate; the user adjusts the pin to the meeting entrance and can edit the final meeting-point text. Search is local and does not make a paid geocoding request. Campus/place changes require refreshing the registry. A live nationwide business search is not configured.

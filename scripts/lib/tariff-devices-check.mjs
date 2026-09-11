const finding = (where, reason) => ({ toothId: 'tariff_device_projection', where, reason });

const FIELDS = Object.freeze([
  ['tariffContractVersion', 'tariffContractVersion'],
  ['userStorageQuotaBytes', 'userStorageQuotaBytes'],
  ['bufferQuotaBytes', 'bufferQuotaBytes'],
  ['datasetCatalogId', 'datasetCatalogId'],
  ['maxUserWorkspaces', 'maxUserWorkspaces'],
]);

function normalize(value) {
  return typeof value === 'bigint' ? value.toString() : value;
}

export function tariffDeviceFindings(expectedDevices, mediaDevices) {
  const mediaById = new Map(mediaDevices.map((device) => [device.id, device]));
  const out = [];
  for (const expected of expectedDevices) {
    const actual = mediaById.get(expected.mediaDeviceId);
    if (!actual) {
      out.push(finding(expected.mediaDeviceId, 'прибор есть в кабинете, но отсутствует в media'));
      continue;
    }
    for (const [expectedField, actualField] of FIELDS) {
      const expectedValue = normalize(expected[expectedField]);
      const actualValue = normalize(actual[actualField]);
      if (actualValue !== expectedValue) {
        out.push(
          finding(
            `${expected.mediaDeviceId}.${actualField}`,
            `media несёт ${String(actualValue)}, тариф мембраны — ${String(expectedValue)}`,
          ),
        );
      }
    }
    const expectedPolicy = expected.bufferPolicy ?? 'stop';
    if (actual.bufferPolicy !== expectedPolicy) {
      out.push(
        finding(
          `${expected.mediaDeviceId}.bufferPolicy`,
          `media несёт ${String(actual.bufferPolicy)}, контекст мембраны — ${String(expectedPolicy)}`,
        ),
      );
    }
  }
  return out;
}

export function expectedDevicesFromCabinetRows(cabinetDevices) {
  return cabinetDevices.map((device) => {
    const tariff = device.node.membrane.tariff;
    return {
      mediaDeviceId: device.mediaDeviceId,
      tariffContractVersion: tariff.tariffContractVersion,
      userStorageQuotaBytes: tariff.userStorageQuotaBytes,
      bufferQuotaBytes: tariff.bufferQuotaBytes,
      datasetCatalogId: tariff.datasetCatalogId,
      maxUserWorkspaces: tariff.maxUserWorkspaces,
      bufferPolicy: 'stop',
    };
  });
}

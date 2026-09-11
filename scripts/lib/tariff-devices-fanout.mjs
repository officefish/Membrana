export function membraneContextFromCabinet(membrane, device) {
  const tariff = membrane.tariff;
  return {
    deviceId: device.mediaDeviceId,
    membrane: {
      membraneId: membrane.id,
      tariffContractVersion: tariff.tariffContractVersion,
      userStorageQuotaBytes: tariff.userStorageQuotaBytes.toString(),
      bufferQuotaBytes: tariff.bufferQuotaBytes.toString(),
      datasetCatalogId: tariff.datasetCatalogId,
      maxUserWorkspaces: tariff.maxUserWorkspaces,
      bufferPolicy: { mode: 'stop', params: null },
    },
  };
}

export function contextsForAllMembranes(membranes) {
  return membranes.flatMap((membrane) =>
    (membrane.nodes ?? []).flatMap((node) =>
      node.device ? [membraneContextFromCabinet(membrane, node.device)] : [],
    ),
  );
}

export async function sendContextsToMedia(contexts, send) {
  let updated = 0;
  let failed = 0;
  for (const context of contexts) {
    const result = await send(context);
    if (result?.ok === false) failed += 1;
    else updated += 1;
  }
  return { attempted: contexts.length, updated, failed };
}

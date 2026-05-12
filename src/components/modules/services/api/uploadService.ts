// src/components/modules/services/api/uploadService.ts
import api from './api';

type TipoUpload =
  | 'foto-perfil'
  | 'documento-bi-frente'
  | 'documento-bi-verso'
  | 'documento-carta-frente'
  | 'documento-carta-verso'
  | 'foto-veiculo'
  | 'prova-entrega';

/**
 * Envia um único ficheiro para o backend.
 * @param tipo   endpoint do upload (ex: 'foto-perfil')
 * @param uri    URI local do ficheiro (do ImagePicker / DocumentPicker)
 * @param mime   mime type (default: image/jpeg)
 */
export const enviarFicheiro = async (
  tipo: TipoUpload,
  uri: string,
  mime = 'image/jpeg',
) => {
  const formData = new FormData();
  const filename = uri.split('/').pop() || `${tipo}.jpg`;

  formData.append('file', {
    uri,
    type: mime,
    name: filename,
  } as any);

  const res = await api.post(`/uploads/${tipo}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data;
};

/**
 * Envia todos os documentos do registo de motoqueiro.
 * Chamado no final do DeliverRegisterFour.
 */
export const enviarDocumentosMotoqueiro = async (docs: {
  fotoPerfil?: string | null;
  fotoFrente?: string | null;      // carta frente
  fotoVerso?: string | null;       // carta verso
  fotoFrenteBI?: string | null;    // BI frente
  fotoVersoBI?: string | null;     // BI verso
  fotoVeiculo?: string | null;
  certFrente?: string | null;      // foto placa
}) => {
  const mapa: Array<{ uri: string | null | undefined; tipo: TipoUpload }> = [
    { uri: docs.fotoPerfil,   tipo: 'foto-perfil' },
    { uri: docs.fotoFrente,   tipo: 'documento-carta-frente' },
    { uri: docs.fotoVerso,    tipo: 'documento-carta-verso' },
    { uri: docs.fotoFrenteBI, tipo: 'documento-bi-frente' },
    { uri: docs.fotoVersoBI,  tipo: 'documento-bi-verso' },
    { uri: docs.fotoVeiculo,  tipo: 'foto-veiculo' },
  ];

  const erros: string[] = [];

  for (const { uri, tipo } of mapa) {
    if (!uri) continue;
    try {
      await enviarFicheiro(tipo, uri);
    } catch (e: any) {
      console.warn(`[Upload] Falha em ${tipo}:`, e.message);
      erros.push(tipo);
    }
  }

  return { sucesso: erros.length === 0, erros };
};
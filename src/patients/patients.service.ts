import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PatientsService {
  constructor(private readonly httpService: HttpService) {}
  async create(patentId) {
    const apiKey = process.env.API_KEY;
    const baseUrl = process.env.BASE_URL;
    const patentUrl = `${baseUrl}/getactivevisits`;
    const headers = {
      Authorization: `Bearer ${apiKey}`,
    };
    const patentsData = await this.httpService
      .get(patentUrl, { headers })
      .toPromise();

    const patient = patentsData.data.filteredresults.find(
      (patient) => patient.patientEId === patentId,
    );
    const vitalUrl = `${baseUrl}/patientVitals?patientEId=${patentId}`;
    const patientVitalsResponse = await this.httpService
      .get(vitalUrl, {
        headers,
      })
      .toPromise();
    return patientVitalsResponse;
  }
}

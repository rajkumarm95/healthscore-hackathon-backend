import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { OpenAIService } from '../openai/openai.service';

@Injectable()
export class PatientsService {
  constructor(
    private readonly httpService: HttpService,
    private openAI: OpenAIService,
  ) {}
  /**
   * @method fetchPatientDetail
   * @description this function fetches data from helthscore and pass it to GPT
   * @param patentId
   * @returns
   */
  async fetchPatientDetail(patentId: string) {
    const apiKey = process.env.API_KEY;
    const baseUrl = process.env.BASE_URL;
    const headers = {
      Authorization: `Bearer ${apiKey}`,
    };
    const patentUrl = `${baseUrl}/getactivevisits`;

    //HealthScore API call
    const patents = await this.httpService
      .get(patentUrl, { headers })
      .toPromise();

    const patientData = patents.data.filteredresults.find(
      (patient) => patient.patientEId === patentId,
    );

    const vitalUrl = `${baseUrl}/patientVitals?patientEId=${patentId}`;

    //HealthScore API call
    const patientVitalsResponse = await this.httpService
      .get(vitalUrl, {
        headers,
      })
      .toPromise();

    const addedVitals: any = {};
    const allVitals = [];
    patientVitalsResponse.data.data.forEach((vitalData) => {
      allVitals.push(vitalData['name']);
      if ('value' in vitalData) {
        addedVitals[vitalData['name']] = vitalData['value'];
      }
    });

    const expectedOutputFromGPT = {
      'Plan 1': {
        Duration: '30 days',
        Focus: 'Balanced diet, moderate exercise',
        Notes:
          'Emphasizes whole grains, lean proteins, and vegetables. Includes light cardio and strength training.',
      },
      'Plan 2': {
        Duration: '60 days',
        Focus: 'Weight management, blood glucose control',
        Notes:
          'Low glycemic diet, increased fiber intake, regular aerobic exercises.',
      },
      'Plan 3': {
        Duration: '90 days',
        Focus: 'Gradual lifestyle change',
        Notes:
          'Progressive changes in diet to increase fruit and vegetable intake, with gradual increase in exercise intensity.',
      },
    };

    const message = [
      {
        role: 'system',
        content: 'You are a good assistance',
      },
      {
        role: 'user',
        content:
          "addedVitals {\n  Temperature: '102.00',\n  'Systolic blood pressure': '90.00',\n  'Diastolic blood pressure': '80.00',\n  'Blood glucose status': '140.00',\n  SpO2: '98.00',\n'Age': 34,\n'Gender':'Male',\n'Height': 5.6 feet,\n'Weight': 58 kg\n} These are the vitals and details of a person. I want to create a diet plan for him. Seeing above data what do you think how many days plan will be good for him to reach normal stage? the plan must be in days and must consider food and excercises. Give me days in key value pare nothing more nothing less, suggest me multiple plans. The data must be in JSON format. ",
      },
      {
        role: 'assistant',
        content: `${JSON.stringify(
          expectedOutputFromGPT,
        )}This is the expected stringified JSON and result. This result must have duration, focus and notes as key and there value.There must be no text content from your end other then the resulting object`,
      },
      {
        role: 'user',
        content: `addedVitals {\n  Temperature: ${addedVitals.Temperature},\n  'Systolic blood pressure': ${addedVitals['Systolic blood pressure']},\n  'Diastolic blood pressure': ${addedVitals['Diastolic blood pressure']},\n  'Blood glucose status': ${addedVitals['Blood glucose status']},\n  SpO2: ${addedVitals.SpO2},\n'Age': ${patientData.age},\n'Gender':${patientData.gender},\n'Height': 5.6 feet,\n'Weight': ${patientData.currentWeight} kg\n} These are the vitals and details of a person. I want to create a diet plan for him. Seeing above data what do you think how many days plan will be good for him to reach normal stage? the plan must be in days and must consider food and excercises. Give me days in key value pare nothing more nothing less, suggest me multiple plans. The data must be in JSON format.`,
      },
    ];
    const result = await this.openAI.chatWithGPT4(message);
    return JSON.parse(result);
  }
}

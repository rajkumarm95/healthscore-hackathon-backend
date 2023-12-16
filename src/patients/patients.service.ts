import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { OpenAIService } from '../openai/openai.service';
import { SuggestDataDTO } from './dto/create-patient.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Patients } from './entities/patient.entity';
import { PatientsSuggestions } from './entities/patient_suggestions.entity';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patients)
    private patientRepository: Repository<Patients>,
    @InjectRepository(PatientsSuggestions)
    private patientSuggestionsRepository: Repository<PatientsSuggestions>,
    private readonly httpService: HttpService,
    private openAI: OpenAIService,
  ) {}

  /**
   * @method suggestGuideForUser
   * @description this function fetches data from helthscore stores in DB and pass it to GPT to get Diet suggestion
   * @param patentId
   * @returns
   */
  async suggestGoals(patentId: string) {
    try {
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
      addedVitals.age = patientData.age;
      addedVitals.gender = patientData.gender;
      addedVitals.Weight = patientData.currentWeight;
      const savedPatient = await this.patientRepository.save(
        this.patientRepository.create({
          patientId: patientData.patientEId,
          vitalData: addedVitals,
        }),
      );
      const expectedOutputFromGPT = [
        {
          topic: 'Manage Blood Pressure',
          description:
            'Aim to maintain or slightly increase the systolic pressure to be within the normal range (100-120 mmHg), while keeping the diastolic pressure stable.',
        },
        {
          topic: 'Regulate Blood Glucose Levels',
          description:
            'Maintain blood glucose within the normal range (70-100 mg/dL fasting, and less than 140 mg/dL post-meal).',
        },
        {
          topic: 'Improve Cardiovascular Health',
          description:
            'Incorporate regular cardiovascular exercises to maintain blood pressure and improve heart health.',
        },
        {
          topic: 'Strength and Flexibility Training',
          description:
            'Include strength training and flexibility exercises to improve muscle tone and joint health.',
        },
        {
          topic: 'Balanced Diet',
          description:
            'Follow a diet rich in fruits, vegetables, whole grains, lean proteins, and healthy fats. Monitor carbohydrate intake to help regulate blood glucose levels.',
        },
        {
          topic: 'Stress Management',
          description:
            'Engage in practices like meditation, yoga, or other relaxation techniques to manage stress.',
        },
      ];

      const message = [
        {
          role: 'system',
          content:
            'You are a dietary nutritionist and exercise specialist.  the output should be in a stringified JSON format and only include the properties mentioned in the assistance role as this output will be directly fed to API. There must be no text content from your end other then the resulting array.',
        },
        {
          role: 'user',
          content:
            'Act as a dietary nutritionist and exercise specialist. Based on the following vital statistics: \n\n- Temperature: 102.00°F\n- Systolic Blood Pressure: 90 mmHg\n- Diastolic Blood Pressure: 80 mmHg\n- Blood Glucose: 140 mg/dL\n- SpO2: 98%\n- Age: 34 years\n- Gender: Male\n- Height: 5.6 feet\n- : 58 kg\n i wanted you to set health goals for the patient so that based on the suggested goals we can suggest them diet and exercise plans',
        },
        {
          role: 'assistant',
          content: `${JSON.stringify(expectedOutputFromGPT)}`,
        },
        {
          role: 'user',
          content: `Act as a dietary nutritionist and exercise specialist. Based on the following vital statistics: ${JSON.stringify(
            addedVitals,
          )} i wanted you to set health goals for the patient so that based on the suggested goals we can suggest them diet and exercise plans`,
        },
      ];
      const response = await this.openAI.chatWithGPT4(message);
      const data = JSON.parse(response);

      data.forEach(async (eachRecord) => {
        await this.patientSuggestionsRepository.save(
          this.patientSuggestionsRepository.create({
            data: eachRecord as any,
            patients: savedPatient,
          }),
        );
      });
      const patientSuggestions = await this.patientSuggestionsRepository.find({
        where: { patients: { patientId: patentId } },
      });
      return { status: 'Success', data: patientSuggestions };
    } catch (error) {
      return {
        status: 'Failed',
        message: 'Error in API',
        code: error.code,
      };
    }
  }

  /**
   * @method choosePlan
   * @description this function fetches and pass user Data along with the suggestions  to GPT get plans
   * @param patentId
   * @returns
   */
  async suggestPlans(body: any) {
    try {
      const { patientId, goalsId } = body;

      const patient = await this.patientRepository.findOne({
        where: { patientId: patientId },
      });
      const patientSuggestions = await this.patientSuggestionsRepository.find({
        where: { id: In(goalsId) },
      });
      const patientVitals = patient.vitalData;
      const patientGoals = patientSuggestions.map((goal) => goal.data);
      console.log('>>>>>>>>>>>>', patientVitals);
      console.log('>>>>>>>>>>>>', patientGoals);

      const expectedOutputFromGPT = [
        {
          Duration: '3 days',
          Focus: 'Balanced diet, moderate exercise',
          Notes:
            'Emphasizes whole grains, lean proteins, and vegetables. Includes light cardio and strength training.',
        },
        {
          Duration: '5 days',
          Focus: 'Weight management, blood glucose control',
          Notes:
            'Low glycemic diet, increased fiber intake, regular aerobic exercises.',
        },
        {
          Duration: '8 days',
          Focus: 'Gradual lifestyle change',
          Notes:
            'Progressive changes in diet to increase fruit and vegetable intake, with gradual increase in exercise intensity.',
        },
      ];

      const message = [
        {
          role: 'system',
          content:
            'You are a dietary nutritionist and exercise specialist. the output should be in a stringified JSON format and  include Duration, Focus and Noted properties mentioned in the assistance role as this output will be directly fed to API. There must be no text content from your end other then the resulting object.',
        },
        {
          role: 'user',
          content:
            "addedVitals {\n  Temperature: '102.00',\n  'Systolic blood pressure': '90.00',\n  'Diastolic blood pressure': '80.00',\n  'Blood glucose status': '140.00',\n  SpO2: '98.00',\n'Age': 34,\n'Gender':'Male',\n'Height': 5.6 feet,\n'Weight': 58 kg\n} These are the vitals and details of a person. I want to create a diet plan for him. Seeing above data what do you think how many days plan will be good for him to reach normal stage? the plan must be in days and must consider food and excercises. Give me days in key value pare nothing more nothing less, suggest me multiple plans. The data must be in JSON format.",
        },
        {
          role: 'assistant',
          content: `${JSON.stringify(expectedOutputFromGPT)}`,
        },
        {
          role: 'user',
          content: `${patientVitals} These are the vitals and details of a person. I want to create a diet plan for him to help him to focus on these ${patientGoals} goals . Seeing above data what do you think how many days plan will be good for him to reach normal stage? the plan must be in days and must consider food and excercises. Give me days in key value pare nothing more nothing less, suggest me multiple plans. The data must be in JSON format.`,
        },
      ];
      const result = await this.openAI.chatWithGPT4(message);
      return { status: 'Success', data: JSON.parse(result) };
    } catch (error) {
      return {
        status: 'Failed',
        message: 'Error in API',
        code: error.code,
      };
    }
  }

  /**
   * @method suggestTrainingPlan
   * @description this function will pass the user details for GPT to get exercise and diet plan
   * @param suggestData
   * @returns
   */
  async suggestTrainingPlan(suggestData: SuggestDataDTO) {
    try {
      const apiKey = process.env.API_KEY;
      const baseUrl = process.env.BASE_URL;
      const patentId = suggestData.patientId;
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
        exercise: [
          [
            { topic: 'Morning Walk', duration: '30 minutes', intensity: 'Low' },
            {
              topic: 'Yoga',
              duration: '20 minutes',
              intensity: 'Low to Moderate',
            },
          ],
          [
            {
              topic: 'Stretching Exercises',
              duration: '20 minutes',
              intensity: 'Low',
            },
            {
              topic: 'Light Weight Training',
              duration: '15 minutes',
              intensity: 'Moderate',
            },
          ],
          [
            { topic: 'Pilates', duration: '30 minutes', intensity: 'Moderate' },
            {
              topic: 'Leisure Swimming',
              duration: '20 minutes',
              intensity: 'Low',
            },
          ],
          [
            { topic: 'Tai Chi', duration: '30 minutes', intensity: 'Low' },
            {
              topic: 'Stationary Bike',
              duration: '20 minutes',
              intensity: 'Moderate',
            },
          ],
          [
            {
              topic: 'Brisk Walking',
              duration: '30 minutes',
              intensity: 'Moderate',
            },
            {
              topic: 'Balance Exercises',
              duration: '20 minutes',
              intensity: 'Low',
            },
          ],
        ],
        diet: [
          [
            {
              meal: 'Breakfast',
              ingredient: 'Oatmeal with fruits, 1 cup; Skim milk, 200 ml',
            },
            {
              meal: 'Lunch',
              ingredient:
                'Grilled chicken breast, 150g; Mixed salad, 1 cup; Whole grain bread, 2 slices',
            },
            {
              meal: 'Dinner',
              ingredient:
                'Baked fish, 150g; Steamed vegetables, 1 cup; Brown rice, 100g',
            },
          ],
          [
            {
              meal: 'Breakfast',
              ingredient: 'Greek yogurt with honey, 1 cup; Almonds, 10 pieces',
            },
            {
              meal: 'Lunch',
              ingredient:
                'Turkey sandwich with lettuce, tomato; Quinoa salad, 1 cup',
            },
            {
              meal: 'Dinner',
              ingredient:
                'Stir-fried tofu with mixed vegetables, 1.5 cups; Jasmine rice, 100g',
            },
          ],
          [
            {
              meal: 'Breakfast',
              ingredient:
                'Scrambled eggs, 2; Whole grain toast, 2 slices; Fresh orange juice, 200 ml',
            },
            {
              meal: 'Lunch',
              ingredient:
                'Lentil soup, 1 bowl; Spinach salad with cherry tomatoes and feta cheese',
            },
            {
              meal: 'Dinner',
              ingredient:
                'Grilled salmon, 150g; Roasted sweet potatoes, 1 cup; Green beans, 1 cup',
            },
          ],
          [
            {
              meal: 'Breakfast',
              ingredient: 'Smoothie with banana, spinach, and protein powder',
            },
            {
              meal: 'Lunch',
              ingredient:
                'Chicken Caesar salad, 1 large bowl; Whole grain roll, 1',
            },
            {
              meal: 'Dinner',
              ingredient:
                'Beef stir-fry with bell peppers and broccoli, 1.5 cups; Brown rice, 100g',
            },
          ],
          [
            {
              meal: 'Breakfast',
              ingredient:
                'Blueberry pancakes, 3; Maple syrup, 2 tablespoons; Skim milk, 200 ml',
            },
            {
              meal: 'Lunch',
              ingredient: 'Vegetable wrap with hummus; Greek salad, 1 cup',
            },
            {
              meal: 'Dinner',
              ingredient:
                'Shrimp pasta with garlic and olive oil; Mixed greens salad, 1 cup',
            },
          ],
        ],
      };

      const message = [
        {
          role: 'system',
          content:
            'You are a dietary nutritionist and exercise specialist. the output should be in a stringified JSON format and only include the properties mentioned in the assistance role as this output will be directly fed to API. There must be no text content from your end other then the resulting object.',
        },
        {
          role: 'user',
          content:
            'Your task is to develop a daily exercise and dietary plan for a patient over a 5-day period, based on the following vital statistics: Temperature: 102.00°F, Systolic Blood Pressure: 90.00 mmHg, Diastolic Blood Pressure: 80.00 mmHg, Blood Glucose Status: 140.00 mg/dL, SpO2: 98.00%, Age: 34 years, Gender: Male, Height: 5.6 feet, Weight: 58 kg. The output should be formatted in JSON.',
        },
        {
          role: 'assistant',
          content: `${JSON.stringify(expectedOutputFromGPT)}`,
        },
        {
          role: 'user',
          content: `Your task is to develop a daily exercise and dietary plan for a patient over a ${suggestData.Duration} period, based on the following vital statistics: Temperature: ${addedVitals.Temperature}°F, Systolic Blood Pressure: ${addedVitals['Systolic blood pressure']} mmHg, Diastolic Blood Pressure: ${addedVitals['Diastolic blood pressure']} mmHg, Blood Glucose Status: ${addedVitals['Blood glucose status']} mg/dL, SpO2: ${addedVitals.SpO2}%, Age: ${patientData.age} years, Gender: ${patientData.gender}, Height: 5.6 feet, Weight: ${patientData.currentWeight} kg. The output should be formatted in JSON.`,
        },
      ];

      const result = await this.openAI.chatWithGPT4(message);
      return { status: 'Success', data: JSON.parse(result) };
    } catch (error) {
      return {
        status: 'Failed',
        message: 'Error in API',
        code: error.code,
      };
    }
  }
}

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { OpenAIService } from '../openai/openai.service';
import { SuggestDataDTO } from './dto/create-patient.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Patients } from './entities/patient.entity';
import { PatientsSuggestions } from './entities/patient_suggestions.entity';
import { Plans } from './entities/plans.entity';
import { Exercise } from './entities/exercise.entity';
import { Diet } from './entities/diet.entity';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patients)
    private patientRepository: Repository<Patients>,
    @InjectRepository(PatientsSuggestions)
    private patientSuggestionsRepository: Repository<PatientsSuggestions>,
    @InjectRepository(Plans)
    private plansRepository: Repository<Plans>,
    @InjectRepository(Exercise)
    private exerciseRepository: Repository<Exercise>,
    @InjectRepository(Diet)
    private dietRepository: Repository<Diet>,
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
      const patientSuggestionsExists =
        await this.patientSuggestionsRepository.find({
          where: { patients: { patientId: patentId } },
        });
      if (patientSuggestionsExists.length) {
        return { status: 'Success', data: patientSuggestionsExists };
      }
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
          content: `${JSON.stringify(
            patientVitals,
          )} These are the vitals and details of a person. I want to create a diet plan for him to help him to focus on these ${JSON.stringify(
            patientGoals,
          )} goals . Seeing above data what do you think how many days plan will be good for him to reach normal stage? the plan must be in days and must consider food and excercises. Give me days in key value pare nothing more nothing less, suggest me multiple plans. The data must be in JSON format.`,
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
      const { patientId, goalsId } = suggestData;

      // const planExists = this.plansRepository.findOne({
      //   where: { patients: { patientId: patientId } },
      //   relations: { diet: true, exercise: true },
      // });
      // if (planExists) {
      //   return { status: 'Success', data: planExists };
      // }
      const patient = await this.patientRepository.findOne({
        where: { patientId: patientId },
      });
      const patientSuggestions = await this.patientSuggestionsRepository.find({
        where: { id: In(goalsId) },
      });
      const patientVitals = patient.vitalData;
      const patientGoals = patientSuggestions.map((goal) => goal.data);
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
          // Existing Western meals...
          // Adding Indian meals
          [
            {
              meal: 'Breakfast',
              ingredient:
                'Poha (flattened rice with vegetables and peanuts), 1 cup; Green tea, 1 cup',
              reason:
                'Light and easy to digest, rich in iron and antioxidants.',
            },
            {
              meal: 'Lunch',
              ingredient:
                'Chapati (whole wheat flatbread), 2; Dal (lentil soup), 1 bowl; Mixed vegetable curry, 1 cup',
              reason:
                'High in protein from dal, fiber from vegetables, and whole grains from chapati.',
            },
            {
              meal: 'Dinner',
              ingredient:
                'Grilled Tandoori chicken, 150g; Brown rice, 100g; Cucumber Raita (yogurt with cucumber), 1 cup',
              reason:
                'Lean protein from chicken, whole grains, and probiotics from yogurt.',
            },
          ],
          [
            {
              meal: 'Breakfast',
              ingredient:
                'Idli (steamed rice cake), 3; Sambar (lentil and vegetable stew), 1 cup; Coconut chutney, 2 tablespoons',
              reason:
                'Low in fat, high in protein from sambar, and beneficial fats from coconut.',
            },
            {
              meal: 'Lunch',
              ingredient:
                'Vegetable Biryani (mixed vegetable rice), 1 cup; Boondi Raita (yogurt with fried chickpea flour balls), 1 cup',
              reason:
                'Balanced meal with carbohydrates, vegetables, and probiotics.',
            },
            {
              meal: 'Dinner',
              ingredient:
                'Paneer Tikka (grilled paneer cheese), 150g; Mixed salad, 1 cup; Roti (whole wheat flatbread), 2',
              reason:
                'High in protein from paneer, fiber from salad, and whole grains from roti.',
            },
          ],
          [
            {
              meal: 'Breakfast',
              ingredient:
                'Masala Omelette (omelette with onions, tomatoes, and spices), 2 eggs; Brown bread, 2 slices',
              reason:
                'Protein-rich eggs with antioxidants from spices, whole grain bread for fiber.',
            },
            {
              meal: 'Lunch',
              ingredient:
                'Rajma (red kidney bean curry), 1 cup; Basmati rice, 1 cup; Green salad, 1 cup',
              reason:
                'High in protein and fiber from rajma, complex carbs from rice.',
            },
            {
              meal: 'Dinner',
              ingredient:
                'Fish curry, 150g; Steamed rice, 1 cup; Okra stir-fry, 1 cup',
              reason:
                'Omega-3 fatty acids from fish, fiber-rich okra, and a light carbohydrate source.',
            },
          ],
          // Continue with similar patterns for additional meals
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
          content: `Your task is to develop a daily exercise and dietary plan for a patient whose is focused on [{
            "topic": "Weight Management",
            "description": "As the patient's weight is not mentioned, it is important to determine a healthy weight range based on height and age, and work towards achieving and maintaining it."
        },{
            "topic": "Regulate Blood Glucose Levels",
            "description": "Maintain blood glucose within the normal range (70-100 mg/dL fasting, and less than 140 mg/dL post-meal)."
        }] goals  over a 5-day period, based on the following vital statistics: Temperature: 102.00°F, Systolic Blood Pressure: 90.00 mmHg, Diastolic Blood Pressure: 80.00 mmHg, Blood Glucose Status: 140.00 mg/dL, SpO2: 98.00%, Age: 34 years, Gender: Male, Height: 5.6 feet, Weight: 58 kg. The output should be formatted in JSON.`,
        },
        {
          role: 'assistant',
          content: `${JSON.stringify(expectedOutputFromGPT)}`,
        },
        {
          role: 'user',
          content: `Your task is to develop a daily exercise and dietary plan for a patient whose is focused on ${JSON.stringify(
            patientGoals,
          )} goals over a 5 days period, based on the following vital statistics: ${JSON.stringify(
            patientVitals,
          )} patientVitals The output should be formatted in JSON.`,
        },
      ];

      const result = await this.openAI.chatWithGPT4(message);
      // const exercisesData = JSON.parse(result).exercise;
      // const plan = new Plans();
      // plan.patients = { patientId: patientId } as any; // Assuming you have the patient ID

      // const savedPlan = await this.plansRepository.save(plan);

      // for (let i = 0; i < exercisesData.length; i++) {
      //   for (const exercise of exercisesData[i]) {
      //     const newExercise = new Exercise();
      //     newExercise.data = JSON.stringify(exercise);
      //     newExercise.day = `Day ${i + 1}`;
      //     newExercise.plan = savedPlan;
      //     await this.exerciseRepository.save(newExercise);
      //   }
      // }
      // const dietData = JSON.parse(result).diet;

      // // Saving diet data
      // for (let i = 0; i < dietData.length; i++) {
      //   for (const diet of dietData[i]) {
      //     const newDiet = new Diet();
      //     newDiet.data = JSON.stringify(diet);
      //     newDiet.day = `Day ${i + 1}`;
      //     newDiet.plan = savedPlan;
      //     await this.dietRepository.save(newDiet);
      //   }
      // }
      // console.log(savedPlan);

      // const planData = await this.plansRepository.findOne({
      //   where: { id: savedPlan.id },
      //   relations: { diet: true, exercise: true },
      // });
      return { status: 'Success', data: JSON.parse(result) };
    } catch (error) {
      return {
        status: 'Failed',
        message: 'Error in API',
        code: error.code,
      };
    }
  }

  async test() {
    const planData = await this.plansRepository.findOne({
      where: { id: '2f7902f7-8f65-47d6-ab74-1456306c11ca' },
      relations: { diet: true, exercise: true },
    });
    return planData;
  }

  async completeDiet(id: string): Promise<string> {
    const diet = await this.dietRepository.findOne({ where: { id } });
    if (!diet) {
      throw new Error('Diet plan not found');
    }

    diet.completed = true;
    await this.dietRepository.save(diet);

    return 'Congratulations on completing your diet plan!';
  }

  async completeExercise(id: string): Promise<string> {
    const exercise = await this.exerciseRepository.findOne({ where: { id } });
    if (!exercise) {
      throw new Error('Exercise plan not found');
    }

    exercise.completed = true;
    await this.exerciseRepository.save(exercise);

    return 'Congratulations on completing your exercise routine!';
  }
}
